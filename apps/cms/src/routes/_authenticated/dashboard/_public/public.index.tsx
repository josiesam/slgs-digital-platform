import { createFileRoute } from "@tanstack/react-router";
import { IconExternalLink, IconFileCheck, IconMenu2, IconWorld } from "@tabler/icons-react";
import { getCmsAdminOverview } from "../../../../admin-overview-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_public/public/",
)({
  loader: () => getCmsAdminOverview(),
  component: PublicWebPage,
});

export function PublicWebPage() {
  const data = Route.useLoaderData();
  return <PublicWebView data={data} />;
}

export function PublicWebView({
  data,
}: {
  readonly data: Awaited<ReturnType<typeof getCmsAdminOverview>>;
}) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
          <span>Public Web</span>
          <span>/</span>
          <span className="text-foreground font-semibold">Published Projections</span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Published Experience</h1>
        <p className="text-sm text-muted-foreground">
          Review the public-facing pages and content that have crossed the approved publication boundary.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Published Pages */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#69439a]">
              Projections
            </span>
            <IconFileCheck className="size-5 text-[#69439a]" />
          </div>
          <div className="text-3xl font-bold font-sans text-foreground">
            {data.publicWeb.publishedPages}
          </div>
          <p className="text-xs text-muted-foreground">
            Only records with approved & published status are exposed to the anonymous public application.
          </p>
          <a
            href="/dashboard/content/pages"
            className="inline-flex items-center text-xs font-semibold text-[#69439a] hover:underline pt-2"
          >
            Manage Content Pages →
          </a>
        </div>

        {/* Card 2: Site Navigation */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8d7d58]">
              Navigation
            </span>
            <IconMenu2 className="size-5 text-[#8d7d58]" />
          </div>
          <div className="text-sm font-semibold text-foreground">
            Status: <span className="text-[#2f7d3b]">{data.publicWeb.navigationStatus}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Primary site navigation hierarchy is maintained cleanly within the public web read boundary.
          </p>
        </div>

        {/* Card 3: Preview & Live Site */}
        <div className="p-5 rounded-xl border border-[#e1e2e3] bg-gradient-to-br from-white to-[#faf9f6] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2f7d3b]">
              Live Experience
            </span>
            <IconWorld className="size-5 text-[#2f7d3b]" />
          </div>
          <p className="text-xs text-muted-foreground">
            Anonymous site preview cannot expose draft revisions, internal review notes, or private media assets.
          </p>
          <a
            href={data.publicWeb.publishedSiteUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-[#42245f] hover:bg-[#542f7f] transition-colors shadow-sm"
          >
            <span>Open Published Site</span>
            <IconExternalLink className="size-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
