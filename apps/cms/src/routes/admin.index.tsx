import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "../admin-shell";
import { getCmsAdminOverview } from "../admin-overview-functions";
import { getCurrentCmsIdentity } from "../access";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    try {
      await getCurrentCmsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: () => getCmsAdminOverview(),
  component: CmsAdminDashboard,
});

const summaryCards = [
  ["Total content", "totalContent", "/admin/content"],
  ["Drafts", "drafts", "/admin/content?state=draft"],
  ["Awaiting review", "awaitingReview", "/admin/content?state=submitted"],
  ["Awaiting approval", "awaitingApproval", "/admin/content?state=in_review"],
  ["Published", "published", "/admin/content?state=published"],
  ["Media assets", "mediaAssets", "/admin/content?view=media"],
  ["Active users", "activeUsers", "/admin/users"],
  ["Active clubs", "activeClubs", "/admin/content?view=clubs"],
] as const;

const formatEvent = (value: string) =>
  value.replaceAll(".", " ").replaceAll("_", " ");

function CmsAdminDashboard() {
  const data = Route.useLoaderData();
  const workflow = [
    ["Drafts", data.workflow.drafts, "/admin/content?state=draft"],
    ["Awaiting review", data.workflow.review, "/admin/content?state=submitted"],
    [
      "Awaiting approval",
      data.workflow.approval,
      "/admin/content?state=in_review",
    ],
    [
      "Ready for publication",
      data.workflow.ready,
      "/admin/content?state=approved",
    ],
  ] as const;
  return (
    <AdminShell>
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">
            Editorial and administrative workspace
          </p>
          <h1>Dashboard</h1>
          <p>
            Manage the school’s public content, publishing workflow and CMS
            access.
          </p>
        </div>
        <div className="admin-identity" aria-label="Signed-in administrator">
          <span>Signed in as</span>
          <strong>{data.identity.displayName}</strong>
          <span>{data.identity.role}</span>
        </div>
      </header>

      <section aria-labelledby="overview-heading">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">At a glance</p>
            <h2 id="overview-heading">CMS overview</h2>
          </div>
          <a className="admin-text-action" href="/admin/content">
            View all content →
          </a>
        </div>
        <div className="admin-stat-grid">
          {summaryCards.map(([label, key, href]) => (
            <a className="admin-stat" href={href} key={key}>
              <strong>{data.summary[key]}</strong>
              <span>{label}</span>
            </a>
          ))}
        </div>
      </section>

      <div className="admin-dashboard-grid">
        <section
          className="admin-panel admin-panel-wide"
          aria-labelledby="workflow-heading"
        >
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Publishing pipeline</p>
              <h2 id="workflow-heading">Editorial workflow</h2>
            </div>
          </div>
          <div className="workflow-summary">
            {workflow.map(([label, count, href]) => (
              <a href={href} key={label}>
                <strong>{count}</strong>
                <span>{label}</span>
                <span aria-hidden="true">→</span>
              </a>
            ))}
          </div>
          {workflow.every(([, count]) => count === 0) ? (
            <p className="admin-empty">
              No items currently require your attention.
            </p>
          ) : null}
          <div className="recent-published">
            <h3>Recently published</h3>
            {data.workflow.recentPublished.length ? (
              <ul>
                {data.workflow.recentPublished.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.type}</small>
                    </span>
                    <time dateTime={item.updatedAt}>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty">No content has been published yet.</p>
            )}
          </div>
        </section>

        <section className="admin-panel" aria-labelledby="users-heading">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Access</p>
              <h2 id="users-heading">User administration</h2>
            </div>
          </div>
          <dl className="admin-metric-list">
            <div>
              <dt>Total users</dt>
              <dd>{data.users.total}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{data.users.active}</dd>
            </div>
            <div>
              <dt>Suspended</dt>
              <dd>{data.users.suspended}</dd>
            </div>
            <div>
              <dt>Inactive</dt>
              <dd>{data.users.inactive}</dd>
            </div>
          </dl>
          <a className="admin-primary-action" href="/admin/users">
            Manage users
          </a>
        </section>

        <section className="admin-panel" aria-labelledby="clubs-heading">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Communities</p>
              <h2 id="clubs-heading">Clubs</h2>
            </div>
          </div>
          {data.clubs.length ? (
            <ul className="admin-compact-list">
              {data.clubs.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <strong>{item.membershipCount} members</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-empty">No active clubs have been configured.</p>
          )}
          <a
            className="admin-secondary-action"
            href="/admin/content?view=clubs"
          >
            Manage clubs
          </a>
        </section>

        <section className="admin-panel" aria-labelledby="public-heading">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Published experience</p>
              <h2 id="public-heading">Public Web</h2>
            </div>
          </div>
          <dl className="admin-metric-list compact">
            <div>
              <dt>Published pages</dt>
              <dd>{data.publicWeb.publishedPages}</dd>
            </div>
            <div>
              <dt>Navigation</dt>
              <dd>{data.publicWeb.navigationStatus}</dd>
            </div>
          </dl>
          <div className="admin-action-row">
            <a className="admin-secondary-action" href="/admin/public-web">
              Manage Public Web
            </a>
            <a
              className="admin-text-action"
              href={data.publicWeb.publishedSiteUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open site ↗
            </a>
          </div>
        </section>

        <section className="admin-panel" aria-labelledby="activity-heading">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Accountability</p>
              <h2 id="activity-heading">Recent activity</h2>
            </div>
          </div>
          {data.recentActivity.length ? (
            <ul className="admin-activity-list">
              {data.recentActivity.slice(0, 5).map((event, index) => (
                <li key={`${event.occurredAt}-${index}`}>
                  <span>
                    <strong>{formatEvent(event.eventType)}</strong>
                    <small>
                      {event.resourceType} · {event.outcome}
                    </small>
                  </span>
                  <time dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-empty">
              No recent CMS activity has been recorded.
            </p>
          )}
          <a
            className="admin-secondary-action"
            href="/admin/content?view=audit"
          >
            View audit log
          </a>
        </section>
      </div>
    </AdminShell>
  );
}
