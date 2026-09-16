import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { ContentIndexView } from "./content.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/pages",
)({
  loader: () => getCmsDashboard(),
  component: ContentPagesPage,
});

function ContentPagesPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} filterType="page" />;
}

