import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCurrentCmsIdentity } from "../access";
import { getCmsAdminOverview } from "../admin-overview-functions";
import { AdminShell } from "../admin-shell";

export const Route = createFileRoute("/admin/public-web")({
  beforeLoad: async () => {
    try {
      await getCurrentCmsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: () => getCmsAdminOverview(),
  component: PublicWebAdministration,
});

function PublicWebAdministration() {
  const data = Route.useLoaderData();
  return (
    <AdminShell>
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Public Web</p>
          <h1>Published experience</h1>
          <p>
            Review the public-facing pages and content that have crossed the
            approved publication boundary.
          </p>
        </div>
      </header>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Pages</p>
              <h2>Published pages</h2>
            </div>
          </div>
          <p className="admin-display-number">
            {data.publicWeb.publishedPages}
          </p>
          <p>
            Only published CMS records are available to the anonymous public
            application.
          </p>
          <a className="admin-secondary-action" href="/admin/content?type=page">
            Manage pages
          </a>
        </section>
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Navigation</p>
              <h2>Site navigation</h2>
            </div>
          </div>
          <p>
            Status: <strong>{data.publicWeb.navigationStatus}</strong>
          </p>
          <p className="admin-empty">
            Primary navigation is currently maintained in the Public Web
            application. CMS editing is not yet supported by the active data
            model.
          </p>
        </section>
        <section id="preview" className="admin-panel admin-panel-wide">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Preview</p>
              <h2>Public-site preview</h2>
            </div>
          </div>
          <p>
            Preview opens the anonymous site and cannot expose drafts, review
            notes or private media.
          </p>
          <a
            id="published-site"
            className="admin-primary-action"
            href={data.publicWeb.publishedSiteUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open published site ↗
          </a>
        </section>
      </div>
    </AdminShell>
  );
}
