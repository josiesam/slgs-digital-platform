import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { ContentIndexView } from "../_content/content.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_editorial/editorial/drafts",
)({
  loader: () => getCmsDashboard(),
  component: EditorialDraftsPage,
});

function EditorialDraftsPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} filterState="drafts" />;
}

