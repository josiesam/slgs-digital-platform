import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { EditorialKanbanView } from "./editorial.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_editorial/editorial/review",
)({
  loader: () => getCmsDashboard(),
  component: EditorialReviewPage,
});

function EditorialReviewPage() {
  const dashboard = Route.useLoaderData();
  return <EditorialKanbanView dashboard={dashboard} activeColumn="review" />;
}
