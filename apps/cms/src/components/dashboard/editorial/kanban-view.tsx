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
  console.log("dashboard: ", dashboard);
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
    <div className="space-y-6 mx-auto p-4 md:p-6 max-w-[1800px]">
      {/* Header */}
      <header className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 pb-4 border-border border-b">
        <div>
          <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs uppercase tracking-wider">
            <span>Editorial Desk</span>
            <span>/</span>
            <span className="font-semibold text-foreground">
              Workflow Kanban Board
            </span>
          </div>
          <h1 className="font-serif font-bold text-foreground text-2xl">
            Editorial Kanban Desk
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage peer reviews, editorial approvals, and public site
            publication boundaries with strict audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex justify-center items-center bg-[#42245f] hover:bg-[#341b4c] shadow px-3.5 py-1.5 rounded-md font-semibold text-white text-xs transition-colors"
          >
            + Create New Content
          </button>
          <span className="bg-[#42245f]/10 px-2.5 py-1 border border-[#42245f]/20 rounded font-semibold text-[#42245f] text-xs">
            Single Base Snapshot Model
          </span>
        </div>
      </header>

      {feedback && (
        <div className="bg-[#2f7d3b]/10 p-3 border border-[#2f7d3b]/20 rounded-lg font-medium text-[#2f7d3b] text-xs">
          {feedback}
        </div>
      )}

      {/* Create Content Modal */}
      {showCreateModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="space-y-4 bg-card shadow-xl p-6 border border-border rounded-xl w-full max-w-lg"
          >
            <div className="flex justify-between items-center pb-3 border-border border-b">
              <h2 className="font-bold text-foreground text-lg">
                Create New Content & Initial Snapshot
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="font-semibold text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block mb-1 font-medium text-foreground text-xs">
                  Content Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full text-xs"
                >
                  <option value="article">Article (News)</option>
                  <option value="event">Event</option>
                  <option value="announcement">Announcement</option>
                  <option value="gallery">Gallery</option>
                  <option value="page">Page</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium text-foreground text-xs">
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
                  className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-foreground text-xs">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  placeholder="e.g. annual-sports-day"
                  className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full font-mono text-xs"
                />
              </div>

              {dashboard.clubs.length > 0 && (
                <div>
                  <label className="block mb-1 font-medium text-foreground text-xs">
                    Owning Club / Organisation
                  </label>
                  <select
                    value={newClubId}
                    onChange={(e) => setNewClubId(e.target.value)}
                    className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full text-xs"
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
                <label className="block mb-1 font-medium text-foreground text-xs">
                  Summary (Optional)
                </label>
                <textarea
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  maxLength={600}
                  rows={2}
                  placeholder="Short introductory summary..."
                  className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-foreground text-xs">
                  Body Content
                </label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={5}
                  placeholder="Write draft content body..."
                  className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-border border-t">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="bg-background hover:bg-accent px-3 py-1.5 border border-input rounded-md font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="bg-[#42245f] hover:bg-[#341b4c] disabled:opacity-50 shadow px-3.5 py-1.5 rounded-md font-semibold text-white text-xs"
              >
                {pending ? "Creating..." : "Create Content & Snapshot 1.0"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Filters */}
      <div className="flex sm:flex-row flex-col justify-between items-center gap-3 bg-card shadow-sm p-3 border border-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <IconSearch className="top-1/2 left-3 absolute size-4 text-muted-foreground -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search items in workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background py-1.5 pr-3 pl-9 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-medium text-muted-foreground text-xs">
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
      <div className="items-start gap-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Column 1: Drafts & Revisions */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "drafts"
              ? "ring-2 ring-[#42245f] border-[#42245f]"
              : "border-border"
          }`}
        >
          <div className="flex justify-between items-center pb-2 border-border border-b">
            <div className="flex items-center gap-2">
              <span className="bg-[#8564ae] rounded-full size-2.5" />
              <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">
                Drafts & Revisions
              </h2>
            </div>
            <span className="bg-secondary px-2 py-0.5 rounded-full font-mono font-semibold text-secondary-foreground text-xs">
              {colDrafts.length}
            </span>
          </div>

          <div className="space-y-3">
            {colDrafts.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg text-muted-foreground text-xs text-center">
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
          <div className="flex justify-between items-center pb-2 border-border border-b">
            <div className="flex items-center gap-2">
              <span className="bg-[#d39a22] rounded-full size-2.5" />
              <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">
                Peer Review Queue
              </h2>
            </div>
            <span className="bg-[#d39a22]/10 px-2 py-0.5 rounded-full font-mono font-semibold text-[#d39a22] text-xs">
              {colReview.length}
            </span>
          </div>

          <div className="space-y-3">
            {colReview.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg text-muted-foreground text-xs text-center">
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
          <div className="flex justify-between items-center pb-2 border-border border-b">
            <div className="flex items-center gap-2">
              <span className="bg-[#79b6d6] rounded-full size-2.5" />
              <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">
                Final Approval Queue
              </h2>
            </div>
            <span className="bg-[#79b6d6]/10 px-2 py-0.5 rounded-full font-mono font-semibold text-[#2f6287] text-xs">
              {colApproval.length}
            </span>
          </div>

          <div className="space-y-3">
            {colApproval.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg text-muted-foreground text-xs text-center">
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
          <div className="flex justify-between items-center pb-2 border-border border-b">
            <div className="flex items-center gap-2">
              <span className="bg-[#2f7d3b] rounded-full size-2.5" />
              <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">
                Published / Live
              </h2>
            </div>
            <span className="bg-[#2f7d3b]/10 px-2 py-0.5 rounded-full font-mono font-semibold text-[#2f7d3b] text-xs">
              {colPublished.length}
            </span>
          </div>

          <div className="space-y-3">
            {colPublished.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg text-muted-foreground text-xs text-center">
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
    <article className="space-y-3 bg-card shadow-sm hover:shadow-md p-4 border border-border hover:border-[#42245f]/30 rounded-lg text-xs transition-all">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-[#42245f]/10 p-1 rounded text-[#42245f]">
            {item.type === "page" && <IconFile className="size-3.5" />}
            {item.type === "article" && <IconArticle className="size-3.5" />}
            {item.type === "event" && (
              <IconCalendarEvent className="size-3.5" />
            )}
            {item.type === "announcement" && <IconBell className="size-3.5" />}
            {item.type === "gallery" && <IconPhoto className="size-3.5" />}
          </span>
          <span className="bg-secondary px-1.5 py-0.5 border rounded font-semibold text-[10px] text-secondary-foreground uppercase tracking-wider">
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
        <h3 className="font-serif font-bold text-foreground text-sm line-clamp-1">
          {item.title}
        </h3>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {item.canonicalPath}
        </p>
      </div>

      {item.summary && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {item.summary}
        </p>
      )}

      {/* Revision & Snapshot Metadata */}
      <div className="space-y-1 bg-muted/40 p-2 border border-border/40 rounded-md font-mono text-[10px]">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Rev:</span>
          <span className="font-bold text-foreground">{revisionLabel}</span>
        </div>
        {snapshotId && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Snapshot:</span>
            <span
              className="max-w-30 text-foreground truncate"
              title={snapshotId}
            >
              {snapshotId}
            </span>
          </div>
        )}
        {baseSnapshotId && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Base Snap:</span>
            <span
              className="max-w-[120px] text-foreground truncate"
              title={baseSnapshotId}
            >
              {baseSnapshotId}
            </span>
          </div>
        )}
        {item.verifiedVersion && (
          <div className="flex justify-between items-center pt-0.5 border-border/30 border-t font-semibold text-emerald-600">
            <span>Verified:</span>
            <span>Version {item.verifiedVersion}</span>
          </div>
        )}
      </div>

      {/* Navigation to Canonical Details Route */}
      <div className="pt-2 border-border border-t">
        <a
          href={`/dashboard/editorial/${item.state}/${item.id}`}
          className="inline-flex justify-center items-center bg-background hover:bg-accent shadow-sm px-3 py-1.5 border border-input rounded-md w-full font-medium text-xs transition-colors hover:text-accent-foreground"
        >
          View Revision Details & Actions →
        </a>
      </div>
    </article>
  );
}
