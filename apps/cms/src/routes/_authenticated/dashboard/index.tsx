import { createFileRoute } from "@tanstack/react-router";

import { getCmsAdminOverview } from "../../../admin-overview-functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  loader: () => getCmsAdminOverview(),
  component: CmsDashboardView,
});

const summaryCards = [
  ["Total content", "totalContent", "/dashboard/content"],
  ["Drafts", "drafts", "/dashboard/editorial/drafts"],
  ["Awaiting review", "awaitingReview", "/dashboard/editorial/review"],
  ["Awaiting approval", "awaitingApproval", "/dashboard/editorial/approval"],
  ["Published", "published", "/dashboard/editorial/published"],
  ["Media assets", "mediaAssets", "/dashboard/content/media"],
  ["Active users", "activeUsers", "/dashboard/access/users"],
  ["Active clubs", "activeClubs", "/dashboard/access/clubs"],
] as const;

const formatEvent = (value: string) =>
  value.replaceAll(".", " ").replaceAll("_", " ");

function CmsDashboardView() {
  const data = Route.useLoaderData();
  const workflow = [
    ["Drafts", data.workflow.drafts, "/dashboard/editorial/drafts"],
    ["Awaiting review", data.workflow.review, "/dashboard/editorial/review"],
    ["Awaiting approval", data.workflow.approval, "/dashboard/editorial/approval"],
    ["Ready for publication", data.workflow.ready, "/dashboard/editorial/published"],
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-start pb-4 border-b">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Editorial and administrative workspace
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage the school’s public content, publishing workflow and CMS access.
          </p>
        </div>
        <div className="text-right text-xs">
          <span className="text-muted-foreground block">Signed in as</span>
          <strong className="text-sm font-semibold block">{data.identity.displayName}</strong>
          <span className="text-muted-foreground">{data.identity.role}</span>
        </div>
      </header>

      <section aria-labelledby="overview-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">At a glance</p>
            <h2 id="overview-heading" className="text-lg font-semibold">CMS overview</h2>
          </div>
          <a className="text-sm font-medium text-primary hover:underline" href="/dashboard/content">
            View all content →
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map(([label, key, href]) => (
            <a
              className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary transition-colors"
              href={href}
              key={key}
            >
              <strong className="text-2xl font-bold block">{data.summary[key]}</strong>
              <span className="text-xs text-muted-foreground">{label}</span>
            </a>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-4 rounded-lg border bg-card shadow-sm space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publishing pipeline</p>
            <h2 className="text-lg font-semibold">Editorial workflow</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {workflow.map(([label, count, href]) => (
              <a
                href={href}
                key={label}
                className="p-3 rounded border flex items-center justify-between hover:bg-accent transition-colors"
              >
                <div>
                  <strong className="text-lg font-semibold block">{count}</strong>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span aria-hidden="true" className="text-muted-foreground">→</span>
              </a>
            ))}
          </div>
          <div className="pt-2">
            <h3 className="text-sm font-semibold mb-2">Recently published</h3>
            {data.workflow.recentPublished.length ? (
              <ul className="divide-y text-xs">
                {data.workflow.recentPublished.map((item) => (
                  <li key={item.id} className="py-2 flex justify-between items-center">
                    <span>
                      <strong className="block text-sm">{item.title}</strong>
                      <small className="text-muted-foreground uppercase">{item.type}</small>
                    </span>
                    <time dateTime={item.updatedAt} className="text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No content has been published yet.</p>
            )}
          </div>
        </section>

        <section className="p-4 rounded-lg border bg-card shadow-sm space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accountability</p>
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          {data.recentActivity.length ? (
            <ul className="divide-y text-xs">
              {data.recentActivity.slice(0, 5).map((event, index) => (
                <li key={`${event.occurredAt}-${index}`} className="py-2 flex justify-between items-center">
                  <span>
                    <strong className="block text-sm capitalize">{formatEvent(event.eventType)}</strong>
                    <small className="text-muted-foreground">
                      {event.resourceType} · {event.outcome}
                    </small>
                  </span>
                  <time dateTime={event.occurredAt} className="text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No recent CMS activity has been recorded.</p>
          )}
          <a
            className="inline-block text-xs font-medium text-primary hover:underline pt-2"
            href="/dashboard/system/log"
          >
            View audit log →
          </a>
        </section>
      </div>
    </div>
  );
}
