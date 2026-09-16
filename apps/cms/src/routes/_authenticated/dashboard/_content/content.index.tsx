import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  IconArticle,
  IconCalendarEvent,
  IconFile,
  IconPlus,
  IconSearch,
  IconPhoto,
  IconBell,
  IconFolder,
} from "@tabler/icons-react";

import {
  createCmsContent,
  getCmsDashboard,
  setCmsContentMedia,
  transitionCmsContent,
  updateCmsContent,
  type CmsPermission,
  type CmsDashboardData,
} from "../../../../cms-functions";
import { DraftEditor } from "../../../../content-editor";
import { GalleryMediaEditor } from "../../../../gallery-media-editor";
import { WorkflowActions, type CmsWorkflowAction } from "../../../../workflow-actions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/",
)({
  loader: () => getCmsDashboard(),
  component: ContentIndexPage,
});

type ContentType = "page" | "article" | "event" | "announcement" | "gallery";
const labels: Record<ContentType, string> = {
  page: "Page",
  article: "News / Article",
  event: "Event",
  announcement: "Announcement",
  gallery: "Gallery",
};

export function ContentIndexPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} />;
}

export function ContentIndexView({
  dashboard,
  filterType,
  filterState,
}: {
  readonly dashboard: CmsDashboardData;
  readonly filterType?: ContentType;
  readonly filterState?: string;
}) {
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>(
    filterState ?? "all",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  const types = (Object.keys(labels) as ContentType[]).filter((type) =>
    filterType
      ? type === filterType
      : permissions.has(`${type}:create:own` as CmsPermission) ||
        permissions.has("content:create:own" as CmsPermission),
  );
  const [selectedType, setSelectedType] = useState<ContentType>(
    filterType ?? types[0] ?? "page",
  );

  async function refresh(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setFeedback(null);
    try {
      await task();
      setFeedback(success);
      await router.invalidate();
    } catch {
      setFeedback(
        "The action could not be completed. Please check permissions and input constraints.",
      );
    } finally {
      setPending(false);
    }
  }

  const handleWorkflowAction = (id: string, value: CmsWorkflowAction, comment?: string) =>
    refresh(
      () => transitionCmsContent({ data: { id, action: value, comment } }),
      "Workflow state updated.",
    );

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return refresh(async () => {
      await createCmsContent({
        data: {
          type: String(data.get("type")),
          title: String(data.get("title")),
          slug: String(data.get("slug")),
          summary: String(data.get("summary") || "") || undefined,
          body: String(data.get("body") || ""),
          seoTitle: String(data.get("seoTitle") || "") || undefined,
          seoDescription: String(data.get("seoDescription") || "") || undefined,
          canonicalPath: String(data.get("canonicalPath") || "") || undefined,
          owningClubId: String(data.get("club") || "") || undefined,
          eventStartAt: String(data.get("eventStartAt") || "") || undefined,
          eventEndAt: String(data.get("eventEndAt") || "") || undefined,
          eventLocation: String(data.get("eventLocation") || "") || undefined,
          eventOrganiser: String(data.get("eventOrganiser") || "") || undefined,
        },
      });
      form.reset();
      setShowCreateModal(false);
    }, "Content draft created.");
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    return refresh(
      () =>
        updateCmsContent({
          data: {
            id,
            changes: {
              title: String(data.get("title")),
              slug: String(data.get("slug")),
              summary: String(data.get("summary") || "") || null,
              body: String(data.get("body") || ""),
              seoTitle: String(data.get("seoTitle") || "") || null,
              seoDescription: String(data.get("seoDescription") || "") || null,
              canonicalPath: String(data.get("canonicalPath") || "") || null,
              eventStartAt: String(data.get("eventStartAt") || "") || null,
              eventEndAt: String(data.get("eventEndAt") || "") || null,
              eventLocation: String(data.get("eventLocation") || "") || null,
              eventOrganiser: String(data.get("eventOrganiser") || "") || null,
            },
          },
        }),
      "New content revision saved.",
    );
  };

  const handleSaveMedia = (id: string, mediaIds: readonly string[]) =>
    refresh(
      () => setCmsContentMedia({ data: { id, mediaIds: [...mediaIds] } }),
      "Gallery media composition updated.",
    );

  const filteredItems = dashboard.content.filter((item) => {
    const matchesType = !filterType || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState =
      selectedStateFilter === "all"
        ? true
        : selectedStateFilter === "drafts"
          ? ["draft", "rejected"].includes(item.state)
          : selectedStateFilter === "review"
            ? ["submitted", "in_review"].includes(item.state)
            : selectedStateFilter === "approval"
              ? item.state === "in_review" && Boolean(item.reviewedAt)
              : item.state === selectedStateFilter;

    return matchesType && matchesSearch && matchesState;
  });

  const titleHeader = filterType
    ? `${labels[filterType]} Management`
    : filterState
      ? `${filterState.replace("_", " ").toUpperCase()} Queue`
      : "Content Management";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>Content</span>
            <span>/</span>
            <span className="text-foreground font-semibold">
              {filterType ? labels[filterType] : filterState ? filterState : "All Items"}
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">{titleHeader}</h1>
          <p className="text-sm text-muted-foreground">
            View, edit, and transition scoped pages, news, events, announcements, and galleries.
          </p>
        </div>

        {types.length > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-[#42245f] hover:bg-[#542f7f] transition-colors shadow-sm"
          >
            <IconPlus className="size-4" />
            <span>Create {filterType ? labels[filterType] : "Draft"}</span>
          </button>
        )}
      </header>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#42245f]/10 border border-[#42245f]/20 text-[#42245f] text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-sm">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium">State:</span>
          {["all", "draft", "submitted", "in_review", "approved", "published"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStateFilter(st)}
              className={`px-2.5 py-1 rounded text-xs capitalize transition-colors font-medium ${
                selectedStateFilter === st
                  ? "bg-[#42245f] text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
            <IconFolder className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No content items found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adjust your filters or create a new draft within your assigned role scope.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4 hover:border-[#69439a]/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-[#42245f]/10 text-[#42245f]">
                      {item.type === "page" && <IconFile className="size-5" />}
                      {item.type === "article" && <IconArticle className="size-5" />}
                      {item.type === "event" && <IconCalendarEvent className="size-5" />}
                      {item.type === "announcement" && <IconBell className="size-5" />}
                      {item.type === "gallery" && <IconPhoto className="size-5" />}
                    </span>
                    <div>
                      <h3 className="text-base font-bold font-serif text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground font-mono">/{item.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-secondary-foreground border">
                      {labels[item.type as ContentType]}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded border capitalize ${
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
                </div>

                {item.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                )}

                {/* Workflow Actions */}
                <div className="pt-2">
                  <WorkflowActions
                    content={item}
                    currentUserId={dashboard.userId}
                    permissions={permissions}
                    pending={pending}
                    onAction={(val, comment) => handleWorkflowAction(item.id, val, comment)}
                  />
                </div>

                {/* Draft Editing & Gallery Composition */}
                {(item.authorUserId === dashboard.userId || permissions.has("content:update:cms")) &&
                ["draft", "rejected"].includes(item.state) ? (
                  <details className="pt-2 border-t border-border group">
                    <summary className="text-xs font-semibold text-[#42245f] cursor-pointer hover:underline py-1">
                      Edit Draft & Media
                    </summary>
                    <div className="mt-3 space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
                      <DraftEditor
                        content={item}
                        pending={pending}
                        onSave={(e) => handleUpdate(e, item.id)}
                      />
                      {item.type === "gallery" && (
                        <GalleryMediaEditor
                          contentId={item.id}
                          contentType={item.type}
                          initialMediaIds={item.mediaIds}
                          media={dashboard.media}
                          pending={pending}
                          onSave={(mediaIds) => handleSaveMedia(item.id, mediaIds)}
                        />
                      )}
                    </div>
                  </details>
                ) : null}

                {/* Revisions & Workflow History */}
                <details className="text-xs text-muted-foreground pt-1">
                  <summary className="cursor-pointer hover:underline font-medium">
                    View Revisions ({item.revisions.length}) & Workflow History ({item.workflow.length})
                  </summary>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded bg-secondary/20 border border-border">
                    <div>
                      <strong className="block text-foreground font-semibold mb-1">Revisions</strong>
                      <ul className="space-y-1 text-[11px]">
                        {item.revisions.map((rev) => (
                          <li key={rev.revision}>
                            Rev {rev.revision} · {rev.createdByName} (
                            {new Date(rev.createdAt).toLocaleDateString()})
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong className="block text-foreground font-semibold mb-1">Workflow Events</strong>
                      <ul className="space-y-1 text-[11px]">
                        {item.workflow.map((w, idx) => (
                          <li key={`${w.occurredAt}-${idx}`}>
                            {w.fromState ?? "created"} ➔ {w.toState} by {w.actorName}
                            {w.comment ? ` ("${w.comment}")` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Create Draft Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-foreground">
                Create {filterType ? labels[filterType] : "Content"} Draft
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">Content Type</span>
                  <select
                    name="type"
                    required
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as ContentType)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {labels[type]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">Owning Club / Society</span>
                  <select name="club" defaultValue="" className="w-full p-2 border rounded-md bg-background">
                    <option value="">
                      {dashboard.clubs.length ? "Select an authorized club" : "School / Global"}
                    </option>
                    {dashboard.clubs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">Title</span>
                  <input
                    name="title"
                    required
                    maxLength={240}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">URL Slug</span>
                  <input
                    name="slug"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    required
                    placeholder="e.g. annual-sports-day"
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Summary</span>
                <textarea
                  name="summary"
                  maxLength={600}
                  rows={2}
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Body Content</span>
                <textarea
                  name="body"
                  rows={6}
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              {selectedType === "event" && (
                <fieldset className="p-3 rounded border border-border space-y-3 bg-secondary/20">
                  <legend className="font-semibold text-foreground px-1">Event Details</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span>Starts</span>
                      <input name="eventStartAt" type="datetime-local" required className="w-full p-2 border rounded bg-background" />
                    </label>
                    <label className="block space-y-1">
                      <span>Ends</span>
                      <input name="eventEndAt" type="datetime-local" className="w-full p-2 border rounded bg-background" />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span>Location</span>
                      <input name="eventLocation" className="w-full p-2 border rounded bg-background" />
                    </label>
                    <label className="block space-y-1">
                      <span>Organiser</span>
                      <input name="eventOrganiser" className="w-full p-2 border rounded bg-background" />
                    </label>
                  </div>
                </fieldset>
              )}

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
                  {pending ? "Creating..." : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
