import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  IconArticle,
  IconBell,
  IconCalendarEvent,
  IconCheck,
  IconCircleCheck,
  IconFile,
  IconFilter,
  IconPhoto,
  IconSearch,
  IconSend,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

import {
  getCmsDashboard,
  transitionCmsContent,
  type CmsDashboardData,
  type CmsPermission,
} from "../../../../cms-functions";
import { WorkflowActions, type CmsWorkflowAction } from "../../../../workflow-actions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_editorial/editorial/",
)({
  loader: () => getCmsDashboard(),
  component: EditorialIndexPage,
});

export function EditorialIndexPage() {
  const dashboard = Route.useLoaderData();
  return <EditorialKanbanView dashboard={dashboard} />;
}

export function EditorialKanbanView({
  dashboard,
  activeColumn,
}: {
  readonly dashboard: CmsDashboardData;
  readonly activeColumn?: "drafts" | "review" | "approval" | "published";
}) {
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

  async function refresh(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setFeedback(null);
    try {
      await task();
      setFeedback(success);
      await router.invalidate();
    } catch {
      setFeedback("Workflow transition failed. Check author-reviewer-approver independence rules.");
    } finally {
      setPending(false);
    }
  }

  const handleWorkflowAction = (id: string, action: CmsWorkflowAction, comment?: string) =>
    refresh(
      () => transitionCmsContent({ data: { id, action, comment } }),
      "Editorial state updated and audited.",
    );

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
    ["draft", "rejected"].includes(item.state),
  );
  const colReview = filteredContent.filter(
    (item) => item.state === "submitted" || (item.state === "in_review" && !item.reviewedAt),
  );
  const colApproval = filteredContent.filter(
    (item) => item.state === "in_review" && Boolean(item.reviewedAt),
  );
  const colPublished = filteredContent.filter((item) =>
    ["approved", "published"].includes(item.state),
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>Editorial Desk</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Workflow Kanban Board</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Editorial Kanban Desk</h1>
          <p className="text-sm text-muted-foreground">
            Manage peer reviews, editorial approvals, and public site publication boundaries with strict audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-[#42245f]/10 text-[#42245f] border border-[#42245f]/20 text-xs font-semibold">
            Independence Enforced
          </span>
        </div>
      </header>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#2f7d3b]/10 border border-[#2f7d3b]/20 text-[#2f7d3b] text-xs font-medium">
          {feedback}
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
          <span className="text-xs text-muted-foreground font-medium">Content Type:</span>
          {["all", "page", "article", "event", "announcement", "gallery"].map((type) => (
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
          ))}
        </div>
      </div>

      {/* Kanban Board Grid (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {/* Column 1: Drafts & Revisions */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "drafts" ? "ring-2 ring-[#42245f] border-[#42245f]" : "border-border"
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
              colDrafts.map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  dashboard={dashboard}
                  permissions={permissions}
                  pending={pending}
                  onAction={(action, comment) => handleWorkflowAction(item.id, action, comment)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Peer Review Queue */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "review" ? "ring-2 ring-[#d39a22] border-[#d39a22]" : "border-border"
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
              colReview.map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  dashboard={dashboard}
                  permissions={permissions}
                  pending={pending}
                  onAction={(action, comment) => handleWorkflowAction(item.id, action, comment)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Final Approval Queue */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "approval" ? "ring-2 ring-[#2f6287] border-[#2f6287]" : "border-border"
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
                <KanbanCard
                  key={item.id}
                  item={item}
                  dashboard={dashboard}
                  permissions={permissions}
                  pending={pending}
                  onAction={(action, comment) => handleWorkflowAction(item.id, action, comment)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 4: Published & Live Projections */}
        <div
          className={`space-y-4 p-4 rounded-xl border bg-card/60 transition-all ${
            activeColumn === "published" ? "ring-2 ring-[#2f7d3b] border-[#2f7d3b]" : "border-border"
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
                <KanbanCard
                  key={item.id}
                  item={item}
                  dashboard={dashboard}
                  permissions={permissions}
                  pending={pending}
                  onAction={(action, comment) => handleWorkflowAction(item.id, action, comment)}
                />
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
  dashboard,
  permissions,
  pending,
  onAction,
}: {
  readonly item: CmsDashboardData["content"][number];
  readonly dashboard: CmsDashboardData;
  readonly permissions: Set<CmsPermission>;
  readonly pending: boolean;
  readonly onAction: (action: CmsWorkflowAction, comment?: string) => void;
}) {
  return (
    <article className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3 hover:shadow-md hover:border-[#42245f]/30 transition-all text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-[#42245f]/10 text-[#42245f]">
            {item.type === "page" && <IconFile className="size-3.5" />}
            {item.type === "article" && <IconArticle className="size-3.5" />}
            {item.type === "event" && <IconCalendarEvent className="size-3.5" />}
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
                : item.state === "in_review" || item.state === "submitted"
                  ? "bg-[#d39a22]/10 text-[#d39a22] border-[#d39a22]/20"
                  : "bg-[#8564ae]/10 text-[#42245f] border-[#8564ae]/20"
          }`}
        >
          {item.state.replace("_", " ")}
        </span>
      </div>

      <div>
        <h3 className="font-serif font-bold text-sm text-foreground line-clamp-1">{item.title}</h3>
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">/{item.slug}</p>
      </div>

      {item.summary && <p className="text-muted-foreground text-[11px] line-clamp-2">{item.summary}</p>}

      {/* Workflow Actions component */}
      <div className="pt-2 border-t border-border">
        <WorkflowActions
          content={item}
          currentUserId={dashboard.userId}
          permissions={permissions}
          pending={pending}
          onAction={onAction}
        />
      </div>
    </article>
  );
}
