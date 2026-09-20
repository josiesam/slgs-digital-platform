import { createFileRoute } from "@tanstack/react-router";

import { getCmsDashboard } from "../../../../cms-functions";

import { EditorialKanbanView } from "../../../../components/dashboard/editorial/kanban-view";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_editorial/editorial/",
)({
  loader: () => getCmsDashboard(),
  component: EditorialIndexPage,
});

export function EditorialIndexPage() {
  const dashboard = Route.useLoaderData();
  return <EditorialKanbanView dashboard={dashboard} />;
}
