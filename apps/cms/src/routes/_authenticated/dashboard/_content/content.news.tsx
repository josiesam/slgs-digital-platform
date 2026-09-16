import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { ContentIndexView } from "./content.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/news",
)({
  loader: () => getCmsDashboard(),
  component: ContentNewsPage,
});

function ContentNewsPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} filterType="article" />;
}

