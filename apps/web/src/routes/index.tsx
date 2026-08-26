import { PageShell } from "@slgs/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <PageShell
      application="Sierra Leone Grammar School"
      eyebrow="Public website"
    >
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          A new digital foundation for SLGS
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The public website shell is ready. Editorial content will be
          introduced through an approved public-content read model in the next
          phase.
        </p>
      </div>
    </PageShell>
  );
}
