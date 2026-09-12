import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { getCurrentCmsIdentity } from "../../../../access";
import { DraftEditor } from "../../../../content-editor";
import { GalleryMediaEditor } from "../../../../gallery-media-editor";
import { WorkflowActions, type CmsWorkflowAction } from "../../../../workflow-actions";
import {
  assignCmsRole,
  archiveCmsMedia,
  createCmsContent,
  createCmsClub,
  createCustomCmsRole,
  getCmsDashboard,
  getMediaDownload,
  initiateMediaUpload,
  finalizeMediaUpload,
  setCustomCmsRoleActive,
  setCmsContentMedia,
  transitionCmsContent,
  updateCmsClub,
  updateCmsContent,
  type CmsPermission,
} from "../../../../cms-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/",
)({
  loader: () => getCmsDashboard(),
  component: CmsContentDashboard,
});

type ContentType = "page" | "article" | "event" | "announcement" | "gallery";
const labels: Record<ContentType, string> = {
  page: "Page",
  article: "News / article",
  event: "Event",
  announcement: "Announcement",
  gallery: "Gallery",
};

function CmsContentDashboard() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);
  const hasAnyPermission = (...values: CmsPermission[]) =>
    values.some((value) => permissions.has(value));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const types = (Object.keys(labels) as ContentType[]).filter((type) =>
    permissions.has(`${type}:create:own` as CmsPermission),
  );
  const [selectedType, setSelectedType] = useState<ContentType>(
    types[0] ?? "page",
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
        "The action was not accepted. Check the fields, workflow state and your access.",
      );
    } finally {
      setPending(false);
    }
  }

  const action = (id: string, value: CmsWorkflowAction, comment?: string) =>
    refresh(
      () => transitionCmsContent({ data: { id, action: value, comment } }),
      "Workflow updated.",
    );

  const create = (event: FormEvent<HTMLFormElement>) => {
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
    }, "Draft created.");
  };

  const update = (event: FormEvent<HTMLFormElement>, id: string) => {
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
      "A new revision was saved.",
    );
  };

  const states = [
    "draft",
    "submitted",
    "in_review",
    "rejected",
    "approved",
    "published",
  ];

  const uploadMedia = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File)) return;
    return refresh(async () => {
      const signatureBytes = Array.from(
        new Uint8Array(await file.slice(0, 32).arrayBuffer()),
      );
      const initiated = await initiateMediaUpload({
        data: {
          filename: file.name,
          declaredMimeType: file.type,
          byteSize: file.size,
          signatureBytes,
          altText: String(data.get("altText")),
          owningClubId: String(data.get("club") || "") || undefined,
        },
      });
      const response = await fetch(initiated.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": initiated.contentType },
        body: file,
      });
      if (!response.ok) throw new Error("Object upload failed.");
      await finalizeMediaUpload({ data: { id: initiated.id } });
      form.reset();
    }, "Image uploaded and verified.");
  };

  const downloadMedia = (id: string) =>
    refresh(async () => {
      const result = await getMediaDownload({ data: { id } });
      window.location.assign(result.downloadUrl);
    }, "Secure download authorized.");

  const archiveMedia = (id: string) =>
    window.confirm(
      "Archive this media asset? It will no longer be available for active content.",
    )
      ? refresh(
          () => archiveCmsMedia({ data: { id } }),
          "Media archived. The private object was retained.",
        )
      : Promise.resolve();

  const saveContentMedia = (id: string, mediaIds: readonly string[]) =>
    refresh(
      () => setCmsContentMedia({ data: { id, mediaIds: [...mediaIds] } }),
      "Gallery composition saved as a new revision.",
    );

  return (
    <div className="p-6 space-y-6">
      <header className="pb-4 border-b flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content operations</p>
          <h1 className="text-2xl font-bold tracking-tight">Content Management</h1>
          <p className="text-sm text-muted-foreground">Create, review, approve and publish school content.</p>
        </div>
        <div className="text-right text-xs">
          <span className="text-muted-foreground block">Signed in</span>
          <strong className="text-sm font-semibold block">{dashboard.identity.displayName}</strong>
          <span className="text-muted-foreground">{dashboard.identity.roles.join(", ") || "Assigned CMS user"}</span>
        </div>
      </header>

      {feedback ? (
        <div className="p-3 rounded bg-accent text-accent-foreground text-sm font-medium" role="status">
          {feedback}
        </div>
      ) : null}

      <section aria-labelledby="overview" className="space-y-3">
        <h2 id="overview" className="text-lg font-semibold">Workflow overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {states.map((state) => (
            <article className="p-3 rounded border bg-card text-card-foreground shadow-sm" key={state}>
              <span className="text-xs text-muted-foreground capitalize block">{state.replace("_", " ")}</span>
              <strong className="text-xl font-bold">
                {dashboard.content.filter((item) => item.state === state).length}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section aria-labelledby="content-list" className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 id="content-list" className="text-lg font-semibold">Authorized content</h2>
            <span className="text-xs text-muted-foreground">{dashboard.content.length} items</span>
          </div>

          {dashboard.content.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center border rounded">
              No content is available in your scope.
            </p>
          ) : (
            <div className="space-y-4">
              {dashboard.content.map((item) => (
                <article className="p-4 rounded-lg border bg-card shadow-sm space-y-3" key={item.id}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold uppercase tracking-wider text-muted-foreground">{labels[item.type]}</span>
                    <span className="px-2 py-0.5 rounded bg-muted font-medium capitalize">{item.state.replace("_", " ")}</span>
                  </div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="text-xs font-mono text-muted-foreground">/{item.slug}</p>
                  <WorkflowActions
                    content={item}
                    currentUserId={dashboard.userId}
                    permissions={permissions}
                    pending={pending}
                    onAction={(value, comment) => action(item.id, value, comment)}
                  />
                  {(item.authorUserId === dashboard.userId ||
                    permissions.has("content:update:cms")) &&
                  ["draft", "rejected"].includes(item.state) ? (
                    <details className="text-xs border-t pt-3">
                      <summary className="cursor-pointer font-medium text-primary">Edit draft</summary>
                      <div className="mt-3 space-y-3">
                        <DraftEditor
                          content={item}
                          pending={pending}
                          onSave={(event) => update(event, item.id)}
                        />
                        <GalleryMediaEditor
                          contentId={item.id}
                          contentType={item.type}
                          initialMediaIds={item.mediaIds}
                          media={dashboard.media}
                          pending={pending}
                          onSave={(mediaIds) => saveContentMedia(item.id, mediaIds)}
                        />
                      </div>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside aria-labelledby="new-draft" className="space-y-4 p-4 rounded-lg border bg-card shadow-sm h-fit">
          <h2 id="new-draft" className="text-lg font-semibold">Create a draft</h2>
          {types.length === 0 ? (
            <p className="text-xs text-muted-foreground">Your role does not include content creation.</p>
          ) : (
            <form className="space-y-3 text-xs" onSubmit={create}>
              <label className="block space-y-1">
                <span className="font-medium">Content type</span>
                <select
                  className="w-full p-2 border rounded bg-background"
                  name="type"
                  required
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.currentTarget.value as ContentType)}
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {labels[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-medium">Title</span>
                <input className="w-full p-2 border rounded bg-background" name="title" maxLength={240} required />
              </label>

              <label className="block space-y-1">
                <span className="font-medium">URL slug</span>
                <input
                  className="w-full p-2 border rounded bg-background font-mono"
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="font-medium">Summary</span>
                <textarea className="w-full p-2 border rounded bg-background" name="summary" maxLength={600} rows={2} />
              </label>

              <label className="block space-y-1">
                <span className="font-medium">Content body</span>
                <textarea className="w-full p-2 border rounded bg-background" name="body" rows={6} />
              </label>

              <button
                disabled={pending}
                type="submit"
                className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded hover:bg-primary/90 transition-colors"
              >
                {pending ? "Working…" : "Create draft"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
