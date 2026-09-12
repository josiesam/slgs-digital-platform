import { createFileRoute } from "@tanstack/react-router";

import { getCmsAdminOverview } from "../../../../admin-overview-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_public/public/",
)({
  loader: () => getCmsAdminOverview(),
  component: PublicWebAdministration,
});

function PublicWebAdministration() {
  const data = Route.useLoaderData();
  return (
    <div className="p-6 space-y-6">
      <header className="pb-4 border-b">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Public Web</p>
        <h1 className="text-2xl font-bold tracking-tight">Published Experience</h1>
        <p className="text-sm text-muted-foreground">
          Review public-facing pages and content that have crossed the approved publication boundary.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-4 rounded-lg border bg-card shadow-sm space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pages</p>
            <h2 className="text-lg font-semibold">Published Pages</h2>
          </div>
          <p className="text-3xl font-bold">{data.publicWeb.publishedPages}</p>
          <p className="text-xs text-muted-foreground">
            Only published CMS records are available to the anonymous public application.
          </p>
          <a
            className="inline-block text-xs font-medium text-primary hover:underline"
            href="/dashboard/content/pages"
          >
            Manage pages →
          </a>
        </section>

        <section className="p-4 rounded-lg border bg-card shadow-sm space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navigation</p>
            <h2 className="text-lg font-semibold">Site Navigation</h2>
          </div>
          <p className="text-xs">
            Status: <strong className="font-semibold">{data.publicWeb.navigationStatus}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Primary navigation is currently maintained in the Public Web application.
          </p>
        </section>

        <section id="preview" className="md:col-span-2 p-4 rounded-lg border bg-card shadow-sm space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
            <h2 className="text-lg font-semibold">Public-Site Preview</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview opens the anonymous site and cannot expose drafts, review notes or private media.
          </p>
          <a
            id="published-site"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground font-semibold rounded text-xs hover:bg-primary/90 transition-colors"
            href={data.publicWeb.publishedSiteUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open published site ↗
          </a>
        </section>
      </div>
    </div>
  );
}
