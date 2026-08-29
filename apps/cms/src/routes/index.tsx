import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { PageShell } from "@slgs/ui";
import { getCurrentCmsIdentity } from "../access";
import { DraftEditor } from "../content-editor";
import { GalleryMediaEditor } from "../gallery-media-editor";
import { WorkflowActions, type CmsWorkflowAction } from "../workflow-actions";
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
} from "../cms-functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      return await getCurrentCmsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: () => getCmsDashboard(),
  component: CmsDashboard,
});

type ContentType = "page" | "article" | "event" | "announcement" | "gallery";
const labels: Record<ContentType, string> = {
  page: "Page",
  article: "News / article",
  event: "Event",
  announcement: "Announcement",
  gallery: "Gallery",
};
function CmsDashboard() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);
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

  const createClub = (event: FormEvent<HTMLFormElement>) => {
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
    }, "Club scope created and audited.");
  };
  const updateClub = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = String(data.get("status")) as
      "active" | "inactive" | "archived";
    if (
      status !== "active" &&
      !window.confirm(
        `Change this club to ${status}? Its current operational availability will change.`,
      )
    ) {
      return Promise.resolve();
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
  const createRole = (event: FormEvent<HTMLFormElement>) => {
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
    }, "Custom CMS role created and audited.");
  };
  const assignRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return refresh(
      () =>
        assignCmsRole({
          data: {
            targetUserId: String(data.get("member")),
            roleId: String(data.get("role")),
            clubId: String(data.get("club") || "") || undefined,
            reason: String(data.get("reason")),
          },
        }),
      "Role assigned without second-person approval and audited.",
    );
  };
  const setRoleActive = (roleId: string, active: boolean) =>
    !active &&
    !window.confirm(
      "Deactivate this custom role? Existing assignments will stop granting authority.",
    )
      ? Promise.resolve()
      : refresh(
          () => setCustomCmsRoleActive({ data: { roleId, active } }),
          active ? "Custom role activated." : "Custom role deactivated.",
        );
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
    <PageShell
      application="SLGS Content Management System"
      eyebrow="Editorial workspace"
    >
      <a className="skip-link" href="#cms-main">
        Skip to CMS workspace
      </a>
      <div id="cms-main" className="cms-workspace">
        <header className="cms-introduction">
          <div>
            <p className="cms-kicker">Content operations</p>
            <h1>Editorial dashboard</h1>
            <p>
              Create, review, approve and publish within your assigned role and
              scope.
            </p>
          </div>
          <div className="cms-identity" aria-label="Current identity">
            <span>Signed in</span>
            <strong>{dashboard.identity.displayName}</strong>
            <span>{dashboard.identity.application}</span>
            <span>
              {dashboard.identity.roles.join(", ") || "Assigned CMS user"}
            </span>
            {dashboard.identity.scopes.length ? (
              <span>{dashboard.identity.scopes.join(", ")}</span>
            ) : null}
          </div>
        </header>
        {feedback ? (
          <p className="cms-feedback" role="status">
            {feedback}
          </p>
        ) : null}
        <section aria-labelledby="overview">
          <h2 id="overview">Workflow overview</h2>
          <div className="cms-stat-grid">
            {states.map((state) => (
              <article className="cms-stat" key={state}>
                <span>{state.replace("_", " ")}</span>
                <strong>
                  {
                    dashboard.content.filter((item) => item.state === state)
                      .length
                  }
                </strong>
              </article>
            ))}
          </div>
        </section>
        {(permissions.has("club:manage:assigned") ||
          permissions.has("configuration:manage:cms")) &&
        dashboard.managedClubs.length ? (
          <section aria-labelledby="club-management">
            <h2 id="club-management">Club lifecycle</h2>
            <div className="cms-admin-grid">
              {dashboard.managedClubs.map((managedClub) => (
                <form
                  className="cms-form"
                  key={managedClub.id}
                  onSubmit={(event) => updateClub(event, managedClub.id)}
                >
                  <h3>{managedClub.name}</h3>
                  <label>
                    Name
                    <input
                      name="name"
                      defaultValue={managedClub.name}
                      required
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      name="description"
                      defaultValue={managedClub.description ?? ""}
                      rows={3}
                    />
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue={managedClub.status}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <button disabled={pending} type="submit">
                    Update club
                  </button>
                </form>
              ))}
            </div>
          </section>
        ) : null}
        {permissions.has("configuration:manage:cms") ? (
          <section aria-labelledby="create-club">
            <h2 id="create-club">Create club scope</h2>
            <form className="cms-form cms-compact-form" onSubmit={createClub}>
              <label htmlFor="club-key">Stable key</label>
              <input
                id="club-key"
                name="key"
                pattern="[a-z][a-z0-9_-]*"
                required
              />
              <label htmlFor="club-name">Club name</label>
              <input id="club-name" name="name" required />
              <label htmlFor="club-description">Description</label>
              <textarea id="club-description" name="description" rows={3} />
              <button disabled={pending} type="submit">
                Create club
              </button>
            </form>
          </section>
        ) : null}
        <section aria-labelledby="operational-queues">
          <h2 id="operational-queues">Operational queues</h2>
          <div className="cms-stat-grid cms-queue-grid">
            {permissions.has("content:review:assigned") ? (
              <article className="cms-stat">
                <span>Requiring review</span>
                <strong>
                  {
                    dashboard.content.filter((item) =>
                      ["submitted", "in_review"].includes(item.state),
                    ).length
                  }
                </strong>
              </article>
            ) : null}
            {permissions.has("content:approve:assigned") ? (
              <article className="cms-stat">
                <span>Requiring approval</span>
                <strong>
                  {
                    dashboard.content.filter(
                      (item) => item.state === "in_review" && item.reviewedAt,
                    ).length
                  }
                </strong>
              </article>
            ) : null}
            {permissions.has("content:publish:approved") ? (
              <article className="cms-stat">
                <span>Ready to publish</span>
                <strong>
                  {
                    dashboard.content.filter(
                      (item) => item.state === "approved",
                    ).length
                  }
                </strong>
              </article>
            ) : null}
          </div>
        </section>
        <section aria-labelledby="media-library">
          <div className="cms-section-heading">
            <div>
              <h2 id="media-library">Media library</h2>
              <p>
                Authorized image metadata and lifecycle state. Binary access
                remains server-mediated.
              </p>
            </div>
            <span className="cms-count">{dashboard.media.length} assets</span>
          </div>
          {permissions.has("media:create:own") ? (
            <form className="cms-form" onSubmit={uploadMedia}>
              <label>
                Image
                <input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                />
              </label>
              <label>
                Alternative text
                <input name="altText" maxLength={500} required />
              </label>
              {dashboard.clubs.length ? (
                <label>
                  Club scope
                  <select name="club" required>
                    <option value="">Select a club</option>
                    {dashboard.clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button disabled={pending} type="submit">
                Upload image
              </button>
            </form>
          ) : null}
          {dashboard.media.length ? (
            <div className="cms-media-grid">
              {dashboard.media.map((asset) => (
                <article className="cms-content-card" key={asset.id}>
                  <div className="cms-content-meta">
                    <span>{asset.mimeType ?? "Pending validation"}</span>
                    <span className="cms-status">{asset.status}</span>
                  </div>
                  <h3>{asset.filename}</h3>
                  <p>{asset.altText}</p>
                  <small>{Math.ceil(asset.byteSize / 1024)} KB</small>
                  {asset.status === "available" ? (
                    <button
                      disabled={pending}
                      onClick={() => downloadMedia(asset.id)}
                      type="button"
                    >
                      Download
                    </button>
                  ) : null}
                  {(permissions.has("media:archive:own") ||
                    permissions.has("media:archive:club")) &&
                  asset.status !== "archived" ? (
                    <button
                      disabled={pending}
                      onClick={() => archiveMedia(asset.id)}
                      type="button"
                    >
                      Archive
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="cms-empty">No media is available in your scope.</p>
          )}
        </section>
        <div className="cms-columns">
          <section aria-labelledby="content-list">
            <div className="cms-section-heading">
              <div>
                <h2 id="content-list">Authorized content</h2>
                <p>Only records visible to an active assignment appear here.</p>
              </div>
              <span className="cms-count">
                {dashboard.content.length} items
              </span>
            </div>
            {dashboard.content.length === 0 ? (
              <p className="cms-empty">
                No content is available in your scope.
              </p>
            ) : (
              <div className="cms-content-list">
                {dashboard.content.map((item) => (
                  <article className="cms-content-card" key={item.id}>
                    <div className="cms-content-meta">
                      <span>{labels[item.type]}</span>
                      <span className="cms-status">
                        {item.state.replace("_", " ")}
                      </span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>/{item.slug}</p>
                    <WorkflowActions
                      content={item}
                      currentUserId={dashboard.userId}
                      permissions={permissions}
                      pending={pending}
                      onAction={(value, comment) =>
                        action(item.id, value, comment)
                      }
                    />
                    {item.authorUserId === dashboard.userId &&
                    ["draft", "rejected"].includes(item.state) ? (
                      <details className="cms-editor">
                        <summary>Edit draft</summary>
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
                          onSave={(mediaIds) =>
                            saveContentMedia(item.id, mediaIds)
                          }
                        />
                      </details>
                    ) : null}
                    <details className="cms-history">
                      <summary>Revision and workflow history</summary>
                      <h4>Revisions</h4>
                      <ol>
                        {item.revisions.map((revision) => (
                          <li key={revision.revision}>
                            Revision {revision.revision} ·{" "}
                            {revision.createdByName}
                          </li>
                        ))}
                      </ol>
                      <h4>Workflow</h4>
                      <ol>
                        {item.workflow.map((event) => (
                          <li key={`${event.occurredAt}-${event.toState}`}>
                            {event.fromState ?? "created"} → {event.toState} ·{" "}
                            {event.actorName}
                            {event.comment ? ` — ${event.comment}` : ""}
                          </li>
                        ))}
                      </ol>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </section>
          <aside aria-labelledby="new-draft">
            <h2 id="new-draft">Create a draft</h2>
            {types.length === 0 ? (
              <p className="cms-empty">
                Your role does not include content creation.
              </p>
            ) : (
              <form className="cms-form" onSubmit={create}>
                <label htmlFor="content-type">Content type</label>
                <select
                  id="content-type"
                  name="type"
                  required
                  value={selectedType}
                  onChange={(event) =>
                    setSelectedType(event.currentTarget.value as ContentType)
                  }
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {labels[type]}
                    </option>
                  ))}
                </select>
                <label htmlFor="content-title">Title</label>
                <input
                  id="content-title"
                  name="title"
                  maxLength={240}
                  required
                />
                <label htmlFor="content-slug">URL slug</label>
                <input
                  id="content-slug"
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  aria-describedby="slug-help"
                  required
                />
                <small id="slug-help">
                  Lowercase words separated by hyphens.
                </small>
                <label htmlFor="content-club">Owning club</label>
                <select
                  id="content-club"
                  name="club"
                  defaultValue=""
                  required={dashboard.clubs.length > 0}
                >
                  <option value="">
                    {dashboard.clubs.length
                      ? "Select an authorized club"
                      : "School / no club"}
                  </option>
                  {dashboard.clubs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="content-summary">Summary</label>
                <textarea
                  id="content-summary"
                  name="summary"
                  maxLength={600}
                  rows={3}
                />
                <label htmlFor="content-body">Content</label>
                <textarea id="content-body" name="body" rows={10} />
                <fieldset>
                  <legend>Search and sharing</legend>
                  <label htmlFor="content-seo-title">SEO title</label>
                  <input
                    id="content-seo-title"
                    name="seoTitle"
                    maxLength={70}
                  />
                  <label htmlFor="content-seo-description">
                    SEO description
                  </label>
                  <textarea
                    id="content-seo-description"
                    name="seoDescription"
                    maxLength={170}
                    rows={2}
                  />
                  <label htmlFor="content-canonical-path">Canonical path</label>
                  <input
                    id="content-canonical-path"
                    name="canonicalPath"
                    placeholder={`/${selectedType === "article" ? "news" : selectedType}/example`}
                  />
                </fieldset>
                {selectedType === "event" ? (
                  <fieldset>
                    <legend>Event details</legend>
                    <label htmlFor="event-start">Starts</label>
                    <input
                      id="event-start"
                      name="eventStartAt"
                      type="datetime-local"
                      required
                    />
                    <label htmlFor="event-end">Ends</label>
                    <input
                      id="event-end"
                      name="eventEndAt"
                      type="datetime-local"
                    />
                    <label htmlFor="event-location">Location</label>
                    <input id="event-location" name="eventLocation" />
                    <label htmlFor="event-organiser">Organiser</label>
                    <input id="event-organiser" name="eventOrganiser" />
                  </fieldset>
                ) : null}
                {selectedType === "gallery" ? (
                  <p className="cms-empty">
                    Create the draft, then add and order available media in its
                    gallery composition editor.
                  </p>
                ) : null}
                <button disabled={pending} type="submit">
                  {pending ? "Working…" : "Create draft"}
                </button>
              </form>
            )}
          </aside>
        </div>
        {permissions.has("role:create:cms") ? (
          <section className="cms-administration" aria-labelledby="cms-admin">
            <div className="cms-section-heading">
              <div>
                <p className="cms-kicker">Restricted administration</p>
                <h2 id="cms-admin">CMS system administration</h2>
                <p>
                  Custom roles remain CMS-only. Assignments are immediately
                  effective and audited.
                </p>
              </div>
            </div>
            <div className="cms-admin-grid">
              <form className="cms-form" onSubmit={createRole}>
                <h3>Create custom CMS role</h3>
                <label htmlFor="role-key">Stable key</label>
                <input
                  id="role-key"
                  name="key"
                  pattern="[a-z][a-z0-9_]*"
                  required
                />
                <label htmlFor="role-name">Role name</label>
                <input id="role-name" name="name" required />
                <label htmlFor="role-description">Description</label>
                <textarea
                  id="role-description"
                  name="description"
                  required
                  rows={3}
                />
                <label htmlFor="role-permissions">Permissions</label>
                <textarea
                  id="role-permissions"
                  name="permissions"
                  aria-describedby="permission-help"
                  required
                  rows={4}
                />
                <small id="permission-help">
                  Comma-separated values from the closed CMS catalogue.
                </small>
                <label htmlFor="role-scopes">Scope dimensions</label>
                <input id="role-scopes" name="scopes" placeholder="club" />
                <button disabled={pending} type="submit">
                  Create role
                </button>
              </form>
              <form className="cms-form" onSubmit={assignRole}>
                <h3>Assign CMS role</h3>
                <label htmlFor="assignment-member">Member</label>
                <select id="assignment-member" name="member" required>
                  {dashboard.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.email}
                    </option>
                  ))}
                </select>
                <label htmlFor="assignment-role">Role</label>
                <select id="assignment-role" name="role" required>
                  {dashboard.roles
                    .filter((role) => role.active)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
                <label htmlFor="assignment-club">Club scope, if required</label>
                <select id="assignment-club" name="club" defaultValue="">
                  <option value="">No club scope</option>
                  {dashboard.clubs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="assignment-reason">Reason</label>
                <textarea
                  id="assignment-reason"
                  name="reason"
                  required
                  rows={3}
                />
                <button disabled={pending} type="submit">
                  Assign role
                </button>
              </form>
            </div>
            <div className="cms-role-list" aria-label="CMS role definitions">
              {dashboard.roles.map((role) => (
                <article className="cms-content-card" key={role.id}>
                  <div>
                    <strong>{role.name}</strong>
                    <p>
                      {role.key} · {role.active ? "active" : "inactive"}
                    </p>
                  </div>
                  {!role.systemManaged ? (
                    <button
                      disabled={pending}
                      onClick={() => setRoleActive(role.id, !role.active)}
                      type="button"
                    >
                      {role.active ? "Deactivate" : "Activate"}
                    </button>
                  ) : (
                    <span className="cms-count">System role</span>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {permissions.has("audit:read:cms") ? (
          <section aria-labelledby="cms-audit">
            <h2 id="cms-audit">CMS audit history</h2>
            {dashboard.audit.length ? (
              <ol className="cms-audit-list">
                {dashboard.audit.map((event) => (
                  <li key={`${event.occurredAt}-${event.eventType}`}>
                    <strong>{event.eventType}</strong> · {event.outcome} ·{" "}
                    {event.resourceType}
                    {event.reasonCode ? ` · ${event.reasonCode}` : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cms-empty">No audit events are visible.</p>
            )}
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
