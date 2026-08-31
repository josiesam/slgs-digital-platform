import { PageShell } from "@slgs/ui";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { getCurrentSimsIdentity } from "../access";
import { canNavigateToSimsCore } from "../core-policy";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: SimsFoundationPage,
});

function SimsFoundationPage() {
  const { permissions } = Route.useRouteContext();
  const canReadCore = canNavigateToSimsCore(permissions);
  return (
    <PageShell
      application="SLGS S.I.M.S."
      eyebrow="Private administration application"
    >
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          S.I.M.S. foundation
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Identity and S.I.M.S. membership checks are active. Administrative
          records are separated from authentication identities.
        </p>
        <Link className="font-medium underline" to="/admin/identities">
          Open identity administration
        </Link>
        {canReadCore ? (
          <a className="font-medium underline" href="/core/students">
            Open S.I.M.S. core administration
          </a>
        ) : null}
        {permissions.some((p) => p.startsWith("attendance:read:")) ? (
          <Link
            className="font-medium underline"
            to="/attendance"
            search={{ search: "" }}
          >
            Open S.I.M.S. attendance administration
          </Link>
        ) : null}
      </div>
    </PageShell>
  );
}
