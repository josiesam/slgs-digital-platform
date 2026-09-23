import {
  CmsDashboardData,
  CmsPermission,
  createCmsContent,
  getCmsDashboard,
} from "../../../../cms-functions";
import { PlateEditor } from "@slgs/ui";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { FormEvent, useState } from "react";


export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/create",
)({
  component: RouteComponent,
  loader: () => getCmsDashboard(),
});

function RouteComponent() {
  const dashboard = Route.useLoaderData();

  return <EditContentPage dashboard={dashboard} />;
}

type ContentType = "page" | "article" | "event" | "announcement" | "gallery";

const labels: Record<ContentType, string> = {
  page: "Page",
  article: "News / Article",
  event: "Event",
  announcement: "Announcement",
  gallery: "Gallery",
};

function EditContentPage({
  dashboard,
  filterType,
  filterState,
}: {
  readonly dashboard: CmsDashboardData;
  readonly filterType?: ContentType;
  readonly filterState?: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();

  const permissions = new Set<CmsPermission>(dashboard.permissions);

  const types = (Object.keys(labels) as ContentType[]).filter((type) =>
    filterType
      ? type === filterType
      : permissions.has(`${type}:create:own` as CmsPermission) ||
        permissions.has("content:create:own" as CmsPermission),
  );

  const [selectedType, setSelectedType] = useState<ContentType>(
    filterType ?? types[0] ?? "page",
  );
  const [bodyValue, setBodyValue] = useState<string>("");


  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      await navigate({ to: ".." });

      form.reset();
    }, "Content draft created.");
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-2">
            <div>
              <h1 className="font-serif font-bold text-foreground text-2xl sm:text-3xl">
                Create Content
              </h1>
              <p className="mt-1 text-muted-foreground text-sm">
                Create and save a new content draft.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              feedback === "Content draft created."
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Basic details */}
          <section className="bg-card shadow-sm p-4 sm:p-6 border border-border rounded-xl">
            <div className="mb-5 pb-4 border-border border-b">
              <h2 className="font-serif font-bold text-foreground text-lg">
                {filterType ? labels[filterType] : "Content Details"}
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Add the basic information for your content.
              </p>
            </div>

            <div className="gap-5 grid grid-cols-1 lg:grid-cols-2">
              <label className="block space-y-2">
                <span className="font-semibold text-foreground text-sm">
                  Content Type
                </span>

                <select
                  name="type"
                  required
                  value={selectedType}
                  onChange={(e) =>
                    setSelectedType(e.target.value as ContentType)
                  }
                  className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {labels[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="font-semibold text-foreground text-sm">
                  Owning Club / Society
                </span>

                <select
                  name="club"
                  defaultValue=""
                  className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
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

              <label className="block space-y-2">
                <span className="font-semibold text-foreground text-sm">
                  Title
                </span>

                <input
                  name="title"
                  required
                  maxLength={240}
                  className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                />
              </label>

              <label className="block space-y-2">
                <span className="font-semibold text-foreground text-sm">
                  URL Slug
                </span>

                <input
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                  placeholder="e.g. annual-sports-day"
                  className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                />

                <span className="text-muted-foreground text-xs">
                  Use lowercase letters, numbers, and hyphens.
                </span>
              </label>
              <label className="block space-y-2 lg:col-span-full">
                <span className="font-semibold text-foreground text-sm">
                  Canonical URL
                </span>

                <input
                  name="canonicalUrl"
                  required
                  placeholder="e.g./annual-sports-day"
                  className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                />
              </label>
            </div>
          </section>

          {/* Content */}
          <section className="bg-card shadow-sm p-4 sm:p-6 border border-border rounded-xl">
            <div className="mb-5 pb-4 border-border border-b">
              <h2 className="font-serif font-bold text-foreground text-lg">
                Content
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Write the summary and main body of your content.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="font-semibold text-foreground text-sm">
                  Summary
                </span>

                <textarea
                  name="summary"
                  maxLength={600}
                  rows={4}
                  className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full text-sm transition resize-y"
                />

                <span className="text-muted-foreground text-xs">
                  A short description used in content listings and previews.
                </span>
              </label>

              <div className="block space-y-2">
                <span className="font-semibold text-foreground text-sm">
                  Body Content
                </span>

                <PlateEditor
                  name="body"
                  value={bodyValue}
                  onChange={setBodyValue}
                  placeholder="Write the main body content of your page or article..."
                />
              </div>

            </div>
          </section>

          {/* Event details */}
          {selectedType === "event" && (
            <section className="bg-card shadow-sm p-4 sm:p-6 border border-border rounded-xl">
              <div className="mb-5 pb-4 border-border border-b">
                <h2 className="font-serif font-bold text-foreground text-lg">
                  Event Details
                </h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  Provide the date, location, and organiser information.
                </p>
              </div>

              <div className="gap-5 grid grid-cols-1 lg:grid-cols-2">
                <label className="block space-y-2">
                  <span className="font-semibold text-foreground text-sm">
                    Starts
                  </span>

                  <input
                    name="eventStartAt"
                    type="datetime-local"
                    required
                    className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="font-semibold text-foreground text-sm">
                    Ends
                  </span>

                  <input
                    name="eventEndAt"
                    type="datetime-local"
                    className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="font-semibold text-foreground text-sm">
                    Location
                  </span>

                  <input
                    name="eventLocation"
                    className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="font-semibold text-foreground text-sm">
                    Organiser
                  </span>

                  <input
                    name="eventOrganiser"
                    className="bg-background px-3 py-2 border border-border focus:border-[#42245f] rounded-md outline-none focus:ring-[#42245f]/20 focus:ring-2 w-full min-h-10 text-sm transition"
                  />
                </label>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex sm:flex-row flex-col-reverse sm:justify-end gap-3 pt-6 border-border border-t">
            <button
              type="button"
              className="hover:bg-accent px-5 py-2 border border-border rounded-md min-h-10 font-medium text-sm transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={pending}
              className="bg-[#42245f] hover:bg-[#542f7f] disabled:opacity-60 px-5 py-2 rounded-md min-h-10 font-semibold text-white text-sm transition disabled:cursor-not-allowed"
            >
              {pending ? "Creating..." : "Save Draft"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
