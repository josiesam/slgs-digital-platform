import { PageShell } from "@slgs/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: SimsFoundationPage });

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
          Confidential school records are not part of Phase 0. All future routes
          will require explicit server-side authentication and authorization.
        </p>
      </div>
    </PageShell>
  );
}
