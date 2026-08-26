import { PageShell } from "@slgs/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: CmsFoundationPage });

function CmsFoundationPage() {
  return (
    <PageShell
      application="SLGS Content Management System"
      eyebrow="Private editorial application"
    >
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          CMS foundation
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Authentication and editorial workflows are intentionally unavailable
          until their policies, schema, and server-side authorization are
          implemented.
        </p>
      </div>
    </PageShell>
  );
}
