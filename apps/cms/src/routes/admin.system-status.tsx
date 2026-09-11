import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCurrentCmsIdentity } from "../access";
import { AdminShell } from "../admin-shell";

export const Route = createFileRoute("/admin/system-status")({
  beforeLoad: async () => {
    try {
      await getCurrentCmsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: CmsSystemStatus,
});

function CmsSystemStatus() {
  return (
    <AdminShell>
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">System</p>
          <h1>System status</h1>
          <p>Operational boundaries and verification state for this CMS.</p>
        </div>
      </header>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <h2>CMS application</h2>
          <p className="admin-status">
            <span aria-hidden="true" /> Available
          </p>
          <p>Authentication and server-side authorization are active.</p>
        </section>
        <section className="admin-panel">
          <h2>Public content boundary</h2>
          <p className="admin-status">
            <span aria-hidden="true" /> Enforced
          </p>
          <p>The Public Web reads published projections only.</p>
        </section>
        <section className="admin-panel admin-panel-wide">
          <h2>Operational verification</h2>
          <p className="admin-empty">
            Production infrastructure, end-to-end publication and monitoring
            status must be verified through the approved operational checklist.
            This page does not infer production health or expose credentials.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
