import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { ContentIndexView } from "../_content/content.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_editorial/editorial/",
)({
  loader: () => getCmsDashboard(),
  component: EditorialIndexPage,
});

function EditorialIndexPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} />;
}

