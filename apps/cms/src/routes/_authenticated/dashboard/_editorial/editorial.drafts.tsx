import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { EditorialKanbanView } from "../../../../components/dashboard/editorial/kanban-view";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_editorial/editorial/drafts",
)({
  loader: () => getCmsDashboard(),
  component: EditorialDraftsPage,
});

function EditorialDraftsPage() {
  const dashboard = Route.useLoaderData();
  return <EditorialKanbanView dashboard={dashboard} activeColumn="drafts" />;
}
