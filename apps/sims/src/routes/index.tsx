import { PageShell } from "@slgs/ui";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { getCurrentSimsIdentity } from "../access";

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
          Identity and S.I.M.S. membership checks are active. Phase 2A is
          limited to staff identity and access administration.
        </p>
        <Link className="font-medium underline" to="/admin/identities">
          Open identity administration
        </Link>
      </div>
    </PageShell>
  );
}
