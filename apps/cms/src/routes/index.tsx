import { PageShell } from "@slgs/ui";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCurrentCmsIdentity } from "../access";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      return await getCurrentCmsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: CmsFoundationPage,
});

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
          Identity and application-membership checks are active. Editorial
          workflows remain outside Phase 1A.
        </p>
      </div>
    </PageShell>
  );
}
