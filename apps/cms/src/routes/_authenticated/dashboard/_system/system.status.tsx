import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_system/system/status",
)({
  component: CmsSystemStatus,
});

function CmsSystemStatus() {
  return (
    <div className="p-6 space-y-6">
      <header className="pb-4 border-b">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System</p>
        <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
        <p className="text-sm text-muted-foreground">Operational boundaries and verification state for this CMS.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-4 rounded-lg border bg-card shadow-sm space-y-2">
          <h2 className="text-base font-semibold">CMS Application</h2>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Available
          </p>
          <p className="text-xs text-muted-foreground">Authentication and server-side authorization are active.</p>
        </section>

        <section className="p-4 rounded-lg border bg-card shadow-sm space-y-2">
          <h2 className="text-base font-semibold">Public Content Boundary</h2>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Enforced
          </p>
          <p className="text-xs text-muted-foreground">The Public Web reads published projections only.</p>
        </section>

        <section className="md:col-span-2 p-4 rounded-lg border bg-card shadow-sm space-y-2">
          <h2 className="text-base font-semibold">Operational Verification</h2>
          <p className="text-xs text-muted-foreground">
            Production infrastructure, end-to-end publication and monitoring status must be verified through the approved operational checklist. This page does not infer production health or expose credentials.
          </p>
        </section>
      </div>
    </div>
  );
}
