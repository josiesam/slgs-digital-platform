import { createFileRoute } from "@tanstack/react-router";
import {
  IconActivity,
  IconArticle,
  IconArrowRight,
  IconExternalLink,
  IconFile,
  IconFolder,
  IconPlus,
  IconSearch,
  IconShield,
  IconUsers,
  IconPhoto,
} from "@tabler/icons-react";

import { getCmsAdminOverview } from "../../../admin-overview-functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  loader: () => getCmsAdminOverview(),
  component: CmsDashboardView,
});

const formatEvent = (value: string) =>
  value.replaceAll(".", " ").replaceAll("_", " ");

function getEventIcon(resourceType: string) {
  switch (resourceType.toLowerCase()) {
    case "article":
    case "content":
      return <IconArticle className="size-4 text-[#42245f]" />;
    case "page":
      return <IconFile className="size-4 text-[#2f7d3b]" />;
    case "media":
      return <IconPhoto className="size-4 text-[#79b6d6]" />;
    case "club":
      return <IconFolder className="size-4 text-[#8d7d58]" />;
    case "user":
    case "membership":
      return <IconUsers className="size-4 text-[#252329]" />;
    default:
      return <IconActivity className="size-4 text-[#c83a32]" />;
  }
}

function CmsDashboardView() {
  const data = Route.useLoaderData();
  const permissions = new Set(data.permissions ?? []);

  const isAdmin =
    permissions.has("role:assign:cms") ||
    permissions.has("user:create:cms") ||
    permissions.has("configuration:manage:cms");

  const canCreateContent =
    isAdmin ||
    permissions.has("content:create:own") ||
    permissions.has("page:create:own") ||
    permissions.has("article:create:own");

  const canCreateMedia = isAdmin || permissions.has("media:create:own");
  const canReadUsers =
    isAdmin ||
    permissions.has("user:read:cms") ||
    permissions.has("membership:read:cms");
  const canReadClubs =
    isAdmin ||
    permissions.has("club:read:cms") ||
    permissions.has("club:manage:assigned");
  const canReadAudit = isAdmin || permissions.has("audit:read:cms");

  const workflow = [
    {
      label: "Drafts",
      count: data.workflow.drafts,
      href: "/dashboard/editorial/drafts",
      color: "bg-[#8564ae]",
    },
    {
      label: "Awaiting review",
      count: data.workflow.review,
      href: "/dashboard/editorial/review",
      color: "bg-[#d39a22]",
    },
    {
      label: "Awaiting approval",
      count: data.workflow.approval,
      href: "/dashboard/editorial/approval",
      color: "bg-[#79b6d6]",
    },
    {
      label: "Ready for publication",
      count: data.workflow.ready,
      href: "/dashboard/editorial/published",
      color: "bg-[#2f7d3b]",
    },
  ];

  const totalWorkflowCount =
    workflow.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header & Quick Action Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>SLGS Digital Platform</span>
            <span>/</span>
            <span className="text-foreground font-semibold">CMS Workspace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground">
            Welcome, {data.identity.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Role-scoped editorial workflow and administrative control panel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search content, files, pages..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
            />
          </div>

          {canCreateContent && (
            <a
              href="/dashboard/content"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#42245f] hover:bg-[#542f7f] transition-colors shadow-sm"
            >
              <IconPlus className="size-3.5" />
              <span>New Content</span>
            </a>
          )}
        </div>
      </header>

      {/* KPI Cards Grid inspired by Constructor mockup & SLGS Palette */}
      <section aria-labelledby="kpi-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="kpi-heading"
            className="text-base font-semibold text-foreground"
          >
            Workspace Overview
          </h2>
          <span className="text-xs text-muted-foreground">
            Real-time permissions: {data.permissions?.length ?? 0} active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Pages & Content (SLGS Purple) */}
          <div className="flex flex-col justify-between p-4 rounded-xl border border-[#dedbe1] bg-gradient-to-br from-[#42245f] to-[#69439a] text-white shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between opacity-90 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Pages
                </span>
                <IconFile className="size-4" />
              </div>
              <div className="text-3xl font-bold font-sans tracking-tight mb-1">
                {data.summary.totalContent}
              </div>
              <p className="text-[11px] opacity-80 mb-3">
                {data.summary.published} published on Web
              </p>
            </div>
            <div className="pt-2 border-t border-white/20 flex items-center justify-between">
              {canCreateContent ? (
                <a
                  href="/dashboard/content/pages"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  <IconPlus className="size-3" />
                  <span>Add Page</span>
                </a>
              ) : (
                <span className="text-[10px] opacity-60">Read Only</span>
              )}
              <a
                href="/dashboard/content/pages"
                className="text-[11px] hover:underline opacity-90"
              >
                View All →
              </a>
            </div>
          </div>

          {/* Card 2: News & Articles (House Secundus Green) */}
          <div className="flex flex-col justify-between p-4 rounded-xl border border-[#dcecdf] bg-gradient-to-br from-[#2f7d3b] to-[#3a9648] text-white shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between opacity-90 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Articles
                </span>
                <IconArticle className="size-4" />
              </div>
              <div className="text-3xl font-bold font-sans tracking-tight mb-1">
                {data.summary.drafts + data.summary.published}
              </div>
              <p className="text-[11px] opacity-80 mb-3">
                {data.summary.drafts} active drafts
              </p>
            </div>
            <div className="pt-2 border-t border-white/20 flex items-center justify-between">
              {canCreateContent ? (
                <a
                  href="/dashboard/content/news"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  <IconPlus className="size-3" />
                  <span>Add Article</span>
                </a>
              ) : (
                <span className="text-[10px] opacity-60">Read Only</span>
              )}
              <a
                href="/dashboard/content/news"
                className="text-[11px] hover:underline opacity-90"
              >
                View All →
              </a>
            </div>
          </div>

          {/* Card 3: Media Assets (House Tertius Sky Blue) */}
          <div className="flex flex-col justify-between p-4 rounded-xl border border-[#dcecf5] bg-gradient-to-br from-[#2f6287] to-[#79b6d6] text-white shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between opacity-90 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider font-sans">
                  Media Files
                </span>
                <IconPhoto className="size-4" />
              </div>
              <div className="text-3xl font-bold font-sans tracking-tight mb-1">
                {data.summary.mediaAssets}
              </div>
              <p className="text-[11px] opacity-80 mb-3">R2 Private Bucket</p>
            </div>
            <div className="pt-2 border-t border-white/20 flex items-center justify-between">
              {canCreateMedia ? (
                <a
                  href="/dashboard/content/media"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  <IconPlus className="size-3" />
                  <span>Upload</span>
                </a>
              ) : (
                <span className="text-[10px] opacity-60">Read Only</span>
              )}
              <a
                href="/dashboard/content/media"
                className="text-[11px] hover:underline opacity-90"
              >
                View All →
              </a>
            </div>
          </div>

          {/* Card 4: Active Clubs (SLGS Khaki) */}
          <div className="flex flex-col justify-between p-4 rounded-xl border border-[#c2b28a]/40 bg-[#eee9dc] text-[#252329] shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between text-[#8d7d58] mb-2">
                <span className="text-xs font-medium uppercase tracking-wider font-sans">
                  Clubs
                </span>
                <IconFolder className="size-4" />
              </div>
              <div className="text-3xl font-bold font-sans tracking-tight text-[#42245f] mb-1">
                {data.summary.activeClubs}
              </div>
              <p className="text-[11px] text-[#65616a] mb-3">
                Registered societies
              </p>
            </div>
            <div className="pt-2 border-t border-[#c2b28a]/40 flex items-center justify-between">
              {canReadClubs ? (
                <a
                  href="/dashboard/access/clubs"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#c2b28a]/30 hover:bg-[#c2b28a]/50 text-[#252329] px-2 py-1 rounded transition-colors"
                >
                  <span>Manage</span>
                </a>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  Restricted
                </span>
              )}
              <a
                href="/dashboard/access/clubs"
                className="text-[11px] font-medium text-[#42245f] hover:underline"
              >
                View All →
              </a>
            </div>
          </div>

          {/* Card 5: User Access (SLGS Ink) */}
          <div className="flex flex-col justify-between p-4 rounded-xl border border-border bg-[#252329] text-white shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between opacity-80 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider font-sans">
                  CMS Users
                </span>
                <IconUsers className="size-4" />
              </div>
              <div className="text-3xl font-bold font-sans tracking-tight mb-1">
                {data.summary.activeUsers}
              </div>
              <p className="text-[11px] opacity-70 mb-3">
                {data.users.total} total accounts
              </p>
            </div>
            <div className="pt-2 border-t border-white/20 flex items-center justify-between">
              {canReadUsers ? (
                <a
                  href="/dashboard/access/users"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  <span>Manage</span>
                </a>
              ) : (
                <span className="text-[10px] opacity-60">Restricted</span>
              )}
              <a
                href="/dashboard/access/users"
                className="text-[11px] hover:underline opacity-80"
              >
                View All →
              </a>
            </div>
          </div>

          {/* Card 6: Audit & Security Logs (House Primus Red Accent) */}
          <div className="flex flex-col justify-between p-4 rounded-xl border border-[#f5d9d7] bg-white text-[#252329] shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between text-[#c83a32] mb-2">
                <span className="text-xs font-medium uppercase tracking-wider font-sans">
                  Audit Trail
                </span>
                <IconShield className="size-4" />
              </div>
              <div className="text-3xl font-bold font-sans tracking-tight text-[#c83a32] mb-1">
                {data.recentActivity.length}
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Recent security events
              </p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              {canReadAudit ? (
                <a
                  href="/dashboard/system/log"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#f5d9d7] hover:bg-[#f5d9d7]/80 text-[#c83a32] px-2 py-1 rounded transition-colors"
                >
                  <span>Logs</span>
                </a>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  Restricted
                </span>
              )}
              <a
                href="/dashboard/system/log"
                className="text-[11px] font-medium text-[#c83a32] hover:underline"
              >
                View Log →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Publishing Pipeline & Latest Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Publishing Pipeline & Visualizer (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <section className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#69439a]">
                  Editorial Lifecycle
                </p>
                <h2 className="text-lg font-serif font-bold text-foreground">
                  Publishing Pipeline
                </h2>
              </div>
              <a
                href="/dashboard/editorial"
                className="text-xs font-medium text-[#69439a] hover:underline inline-flex items-center gap-1"
              >
                <span>Editorial Desk</span>
                <IconArrowRight className="size-3" />
              </a>
            </div>

            {/* Workflow Progress Visualizer Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Pipeline Stage Distribution</span>
                <span>{data.summary.totalContent} items tracked</span>
              </div>
              <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex">
                {workflow.map((item) => {
                  const pct = Math.round(
                    (item.count / totalWorkflowCount) * 100,
                  );
                  if (pct === 0) return null;
                  return (
                    <div
                      key={item.label}
                      style={{ width: `${pct}%` }}
                      className={`${item.color} h-full transition-all`}
                      title={`${item.label}: ${item.count} items (${pct}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Workflow Stage Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {workflow.map((stage) => (
                <a
                  key={stage.label}
                  href={stage.href}
                  className="p-3.5 rounded-lg border border-border bg-background hover:bg-accent/50 hover:border-[#69439a]/40 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`size-2.5 rounded-full ${stage.color}`} />
                    <IconArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div>
                    <strong className="text-2xl font-bold text-foreground block">
                      {stage.count}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {stage.label}
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {/* Recently Published Content List */}
            <div className="pt-3 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Recently Published Content
              </h3>
              {data.workflow.recentPublished.length ? (
                <div className="divide-y divide-border rounded-lg border border-border bg-background">
                  {data.workflow.recentPublished.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between hover:bg-accent/30 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-1.5 rounded bg-secondary text-[#42245f]">
                          {item.type === "page" ? (
                            <IconFile className="size-4" />
                          ) : (
                            <IconArticle className="size-4" />
                          )}
                        </span>
                        <div>
                          <strong className="font-semibold text-foreground block text-sm">
                            {item.title}
                          </strong>
                          <span className="text-[11px] text-muted-foreground capitalize">
                            {item.type}
                          </span>
                        </div>
                      </div>
                      <time
                        dateTime={item.updatedAt}
                        className="text-[11px] text-muted-foreground"
                      >
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </time>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2 italic">
                  No content has been published yet.
                </p>
              )}
            </div>
          </section>

          {/* Community & Public Site Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active Clubs Widget */}
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Registered Societies
                </h3>
                <span className="text-xs text-muted-foreground">
                  {data.clubs.length} total
                </span>
              </div>
              {data.clubs.length ? (
                <ul className="space-y-2 text-xs">
                  {data.clubs.slice(0, 4).map((clubItem) => (
                    <li
                      key={clubItem.id}
                      className="flex items-center justify-between p-2 rounded bg-secondary/50"
                    >
                      <span className="font-medium text-foreground">
                        {clubItem.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-background border text-muted-foreground">
                        {clubItem.membershipCount} members
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No active clubs listed.
                </p>
              )}
            </div>

            {/* Public Web Readiness Widget */}
            <div className="p-4 rounded-xl border border-[#e1e2e3] bg-gradient-to-br from-white to-[#faf9f6] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Public Site Readiness
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20">
                  Online
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-background border">
                  <span className="text-[10px] text-muted-foreground block">
                    Published Pages
                  </span>
                  <strong className="text-base font-bold text-foreground">
                    {data.publicWeb.publishedPages}
                  </strong>
                </div>
                <div className="p-2 rounded bg-background border">
                  <span className="text-[10px] text-muted-foreground block font-sans">
                    Navigation
                  </span>
                  <strong className="text-xs font-semibold text-[#42245f] block truncate">
                    {data.publicWeb.navigationStatus}
                  </strong>
                </div>
              </div>
              <a
                href={data.publicWeb.publishedSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-border bg-background hover:bg-accent transition-colors text-foreground"
              >
                <span>Open Published Website</span>
                <IconExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Latest Events & Activity Timeline (1 col) */}
        <div className="space-y-6">
          <section className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#c83a32]">
                  Accountability
                </p>
                <h2 className="text-lg font-serif font-bold text-foreground">
                  Latest Events
                </h2>
              </div>
              {canReadAudit && (
                <a
                  href="/dashboard/system/log"
                  className="text-xs font-medium text-[#c83a32] hover:underline"
                >
                  View Log →
                </a>
              )}
            </div>

            {data.recentActivity.length ? (
              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {data.recentActivity.map((event, index) => (
                  <div
                    key={`${event.occurredAt}-${index}`}
                    className="relative group"
                  >
                    <span className="absolute -left-[1.35rem] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-background border-2 border-[#42245f]" />
                    <div className="p-3 rounded-lg border border-border bg-background hover:bg-accent/30 transition-colors space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {getEventIcon(event.resourceType)}
                          <strong className="text-xs font-semibold capitalize text-foreground">
                            {formatEvent(event.eventType)}
                          </strong>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            event.outcome === "success"
                              ? "bg-[#2f7d3b]/10 text-[#2f7d3b]"
                              : "bg-[#c83a32]/10 text-[#c83a32]"
                          }`}
                        >
                          {event.outcome}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Resource:{" "}
                        <span className="font-medium text-foreground">
                          {event.resourceType}
                        </span>
                      </p>
                      <time
                        dateTime={event.occurredAt}
                        className="text-[10px] text-muted-foreground block pt-1"
                      >
                        {new Date(event.occurredAt).toLocaleString()}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No recent activity events recorded.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
