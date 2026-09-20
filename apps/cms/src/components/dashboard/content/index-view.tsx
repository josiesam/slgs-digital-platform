import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
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
  setCmsContentMedia,
  updateCmsContent,
  type CmsPermission,
  type CmsDashboardData,
} from "../../../cms-functions";
import { DraftEditor, DraftReview } from "../../../content-editor";
import { GalleryMediaEditor } from "../../../gallery-media-editor";

type ContentType = "page" | "article" | "event" | "announcement" | "gallery";
const labels: Record<ContentType, string> = {
  page: "Page",
  article: "News / Article",
  event: "Event",
  announcement: "Announcement",
  gallery: "Gallery",
};

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
          : item.state === selectedStateFilter;

    return matchesType && matchesSearch && matchesState;
  });

  const titleHeader = filterType
    ? `${labels[filterType]} Repository`
    : "Content Repository & Drafts";

  return (
    <div className="space-y-6 mx-auto p-4 md:p-6 max-w-[1600px]">
      {/* Header */}
      <header className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 pb-4 border-border border-b">
        <div>
          <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs uppercase tracking-wider">
            <span>Content CRUD</span>
            <span>/</span>
            <span className="font-semibold text-foreground">
              {filterType ? labels[filterType] : "Draft Repository"}
            </span>
          </div>
          <h1 className="font-serif font-bold text-foreground text-2xl">
            {titleHeader}
          </h1>
          <p className="text-muted-foreground text-sm">
            Create, edit, and manage draft content items. All edits here are
            saved as draft revisions.
          </p>
        </div>

        {types.length > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex justify-center items-center gap-1.5 bg-[#42245f] hover:bg-[#542f7f] shadow-sm px-4 py-2 rounded-md font-semibold text-white text-xs transition-colors"
          >
            <IconPlus className="size-4" />
            <span>New Draft {filterType ? labels[filterType] : ""}</span>
          </button>
        )}
      </header>

      {/* Draft Mode Notice */}
      <div className="flex justify-between items-center bg-[#42245f]/5 p-3.5 border border-[#42245f]/20 rounded-xl text-[#42245f] text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-[#42245f] px-2 py-0.5 rounded font-bold text-[10px] text-white uppercase tracking-wider">
            Draft Mode
          </span>
          <span>
            All content created or modified in this section is stored in{" "}
            <strong>Draft</strong> state. To transition items through peer
            review, approval, and publication, visit the{" "}
            <strong>Editorial Kanban Desk</strong>.
          </span>
        </div>
        <a
          href="/dashboard/editorial"
          className="ml-2 font-semibold text-[#42245f] text-xs hover:underline whitespace-nowrap"
        >
          Go to Editorial Desk →
        </a>
      </div>

      {feedback && (
        <div className="bg-[#2f7d3b]/10 p-3 border border-[#2f7d3b]/20 rounded-lg font-medium text-[#2f7d3b] text-xs">
          {feedback}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex sm:flex-row flex-col justify-between items-center gap-3 bg-card shadow-sm p-3 border border-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <IconSearch className="top-1/2 left-3 absolute size-4 text-muted-foreground -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter drafts by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background py-1.5 pr-3 pl-9 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="font-medium text-muted-foreground text-xs">
            State:
          </span>
          {["all", "drafts", "submitted", "in_review", "published"].map(
            (st) => (
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
            ),
          )}
        </div>
      </div>

      {/* Content List (CRUD Focused) */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-card p-12 border border-border border-dashed rounded-xl text-center">
            <IconFolder className="opacity-50 mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="font-semibold text-foreground text-sm">
              No draft content items found
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Create a new draft item using the button above to get started.
            </p>
          </div>
        ) : (
          <div className="gap-4 grid grid-cols-1">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="space-y-4 bg-card shadow-sm p-5 border border-border hover:border-[#69439a]/30 rounded-xl transition-all"
              >
                <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-2 pb-3 border-border border-b">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#42245f]/10 p-2 rounded-lg text-[#42245f]">
                      {item.type === "page" && <IconFile className="size-5" />}
                      {item.type === "article" && (
                        <IconArticle className="size-5" />
                      )}
                      {item.type === "event" && (
                        <IconCalendarEvent className="size-5" />
                      )}
                      {item.type === "announcement" && (
                        <IconBell className="size-5" />
                      )}
                      {item.type === "gallery" && (
                        <IconPhoto className="size-5" />
                      )}
                    </span>
                    <div>
                      <h3 className="font-serif font-bold text-foreground text-base">
                        {item.title}
                      </h3>
                      <p className="font-mono text-muted-foreground text-xs">
                        /{item.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-secondary px-2 py-0.5 border rounded font-semibold text-[11px] text-secondary-foreground uppercase tracking-wider">
                      {labels[item.type as ContentType]}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded border capitalize ${
                        item.state === "published"
                          ? "bg-[#2f7d3b]/10 text-[#2f7d3b] border-[#2f7d3b]/20"
                          : item.state === "approved"
                            ? "bg-[#79b6d6]/10 text-[#2f6287] border-[#79b6d6]/20"
                            : item.state === "in_review" ||
                                item.state === "submitted"
                              ? "bg-[#d39a22]/10 text-[#d39a22] border-[#d39a22]/20"
                              : "bg-[#8564ae]/10 text-[#42245f] border-[#8564ae]/20"
                      }`}
                    >
                      {item.state.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {item.summary && (
                  <p className="text-muted-foreground text-xs line-clamp-2">
                    {item.summary}
                  </p>
                )}

                {/* Draft Editing & Gallery Composition */}
                <details
                  className="group pt-2 border-border border-t"
                  open={["draft", "rejected"].includes(item.state)}
                >
                  <summary className="py-1 font-semibold text-[#42245f] text-xs hover:underline cursor-pointer">
                    Preview Draft & Media Details
                  </summary>
                  <div className="space-y-4 bg-secondary/30 mt-3 p-4 border border-border rounded-lg">
                    <DraftReview
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
                        onSave={(mediaIds) =>
                          handleSaveMedia(item.id, mediaIds)
                        }
                      />
                    )}
                  </div>
                </details>

                {/* Revisions & Workflow History */}
                <details className="pt-1 text-muted-foreground text-xs">
                  <summary className="font-medium hover:underline cursor-pointer">
                    View Revisions ({item.revisions.length}) & Workflow History
                    ({item.workflow.length})
                  </summary>
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2 bg-secondary/20 mt-2 p-3 border border-border rounded">
                    <div>
                      <strong className="block mb-1 font-semibold text-foreground">
                        Revisions
                      </strong>
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
                      <strong className="block mb-1 font-semibold text-foreground">
                        Workflow Events
                      </strong>
                      <ul className="space-y-1 text-[11px]">
                        {item.workflow.map((w, idx) => (
                          <li key={`${w.occurredAt}-${idx}`}>
                            {w.fromState ?? "created"} ➔ {w.toState} by{" "}
                            {w.actorName}
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
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="space-y-4 bg-card shadow-xl p-6 border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-border border-b">
              <h2 className="font-serif font-bold text-foreground text-lg">
                Create {filterType ? labels[filterType] : "Content"} Draft
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="font-bold text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    Content Type
                  </span>
                  <select
                    name="type"
                    required
                    value={selectedType}
                    onChange={(e) =>
                      setSelectedType(e.target.value as ContentType)
                    }
                    className="bg-background p-2 border rounded-md w-full"
                  >
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {labels[type]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    Owning Club / Society
                  </span>
                  <select
                    name="club"
                    defaultValue=""
                    className="bg-background p-2 border rounded-md w-full"
                  >
                    <option value="">
                      {dashboard.clubs.length
                        ? "Select an authorized club"
                        : "School / Global"}
                    </option>
                    {dashboard.clubs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">Title</span>
                  <input
                    name="title"
                    required
                    maxLength={240}
                    className="bg-background p-2 border rounded-md w-full"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    URL Slug
                  </span>
                  <input
                    name="slug"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    required
                    placeholder="e.g. annual-sports-day"
                    className="bg-background p-2 border rounded-md w-full"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Summary</span>
                <textarea
                  name="summary"
                  maxLength={600}
                  rows={2}
                  className="bg-background p-2 border rounded-md w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Body Content
                </span>
                <textarea
                  name="body"
                  rows={6}
                  className="bg-background p-2 border rounded-md w-full"
                />
              </label>

              {selectedType === "event" && (
                <fieldset className="space-y-3 bg-secondary/20 p-3 border border-border rounded">
                  <legend className="px-1 font-semibold text-foreground">
                    Event Details
                  </legend>
                  <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span>Starts</span>
                      <input
                        name="eventStartAt"
                        type="datetime-local"
                        required
                        className="bg-background p-2 border rounded w-full"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span>Ends</span>
                      <input
                        name="eventEndAt"
                        type="datetime-local"
                        className="bg-background p-2 border rounded w-full"
                      />
                    </label>
                  </div>
                  <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span>Location</span>
                      <input
                        name="eventLocation"
                        className="bg-background p-2 border rounded w-full"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span>Organiser</span>
                      <input
                        name="eventOrganiser"
                        className="bg-background p-2 border rounded w-full"
                      />
                    </label>
                  </div>
                </fieldset>
              )}

              <div className="flex justify-end gap-2 pt-2 border-border border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="hover:bg-accent px-4 py-2 border border-border rounded-md font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-[#42245f] hover:bg-[#542f7f] px-4 py-2 rounded-md font-semibold text-white text-xs"
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
