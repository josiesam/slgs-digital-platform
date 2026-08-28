import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { PageShell } from "@slgs/ui";
import { getCurrentCmsIdentity } from "../access";
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
  transitionCmsContent,
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
type Action =
  | "submit"
  | "start_review"
  | "complete_review"
  | "reject"
  | "approve"
  | "publish"
  | "unpublish";

function CmsDashboard() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const types = (Object.keys(labels) as ContentType[]).filter((type) =>
    permissions.has(`${type}:create:own` as CmsPermission),
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
  const action = (id: string, value: Action) =>
    refresh(
      () => transitionCmsContent({ data: { id, action: value } }),
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
          owningClubId: String(data.get("club") || "") || undefined,
          eventStartAt: String(data.get("eventStartAt") || "") || undefined,
          eventEndAt: String(data.get("eventEndAt") || "") || undefined,
          eventLocation: String(data.get("eventLocation") || "") || undefined,
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
              summary: String(data.get("summary") || ""),
              body: String(data.get("body") || ""),
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
    refresh(
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
    refresh(
      () => archiveCmsMedia({ data: { id } }),
      "Media archived. The private object was retained.",
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
            <strong>{dashboard.userId}</strong>
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
                    <div
                      className="cms-actions"
                      aria-label={`Actions for ${item.title}`}
                    >
                      {item.authorUserId === dashboard.userId &&
                      ["draft", "rejected"].includes(item.state) ? (
                        <button
                          disabled={pending}
                          onClick={() => action(item.id, "submit")}
                          type="button"
                        >
                          Submit
                        </button>
                      ) : null}
                      {item.state === "submitted" &&
                      permissions.has("content:review:assigned") &&
                      item.authorUserId !== dashboard.userId ? (
                        <button
                          disabled={pending}
                          onClick={() => action(item.id, "start_review")}
                          type="button"
                        >
                          Start review
                        </button>
                      ) : null}
                      {item.state === "in_review" &&
                      permissions.has("content:review:assigned") &&
                      item.authorUserId !== dashboard.userId ? (
                        <>
                          <button
                            disabled={pending}
                            onClick={() => action(item.id, "complete_review")}
                            type="button"
                          >
                            Complete review
                          </button>
                          <button
                            className="secondary"
                            disabled={pending}
                            onClick={() => action(item.id, "reject")}
                            type="button"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {item.state === "in_review" &&
                      permissions.has("content:approve:assigned") &&
                      item.authorUserId !== dashboard.userId ? (
                        <button
                          disabled={pending}
                          onClick={() => action(item.id, "approve")}
                          type="button"
                        >
                          Approve
                        </button>
                      ) : null}
                      {item.state === "approved" &&
                      permissions.has("content:publish:approved") ? (
                        <button
                          disabled={pending}
                          onClick={() => action(item.id, "publish")}
                          type="button"
                        >
                          Publish
                        </button>
                      ) : null}
                      {item.state === "published" &&
                      permissions.has("content:unpublish:published") ? (
                        <button
                          className="secondary"
                          disabled={pending}
                          onClick={() => action(item.id, "unpublish")}
                          type="button"
                        >
                          Unpublish
                        </button>
                      ) : null}
                    </div>
                    {item.authorUserId === dashboard.userId &&
                    ["draft", "rejected"].includes(item.state) ? (
                      <details className="cms-editor">
                        <summary>Edit draft</summary>
                        <form onSubmit={(event) => update(event, item.id)}>
                          <label htmlFor={`title-${item.id}`}>Title</label>
                          <input
                            id={`title-${item.id}`}
                            name="title"
                            defaultValue={item.title}
                            required
                          />
                          <label htmlFor={`summary-${item.id}`}>Summary</label>
                          <textarea
                            id={`summary-${item.id}`}
                            name="summary"
                            rows={2}
                          />
                          <label htmlFor={`body-${item.id}`}>Content</label>
                          <textarea
                            id={`body-${item.id}`}
                            name="body"
                            rows={7}
                          />
                          <button disabled={pending} type="submit">
                            Save revision
                          </button>
                        </form>
                      </details>
                    ) : null}
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
                  defaultValue={types[0]}
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
                <select id="content-club" name="club" defaultValue="">
                  <option value="">School / no club</option>
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
                  <legend>Event details, when applicable</legend>
                  <label htmlFor="event-start">Starts</label>
                  <input
                    id="event-start"
                    name="eventStartAt"
                    type="datetime-local"
                  />
                  <label htmlFor="event-end">Ends</label>
                  <input
                    id="event-end"
                    name="eventEndAt"
                    type="datetime-local"
                  />
                  <label htmlFor="event-location">Location</label>
                  <input id="event-location" name="eventLocation" />
                </fieldset>
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
              <form className="cms-form" onSubmit={createClub}>
                <h3>Create club scope</h3>
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
      </div>
    </PageShell>
  );
}
