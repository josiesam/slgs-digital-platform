import { createFileRoute } from "@tanstack/react-router";

import { getCmsDashboard } from "../../../../cms-functions";
import { ContentIndexView } from "../../../../components/dashboard/content/index-view";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/",
)({
  loader: () => getCmsDashboard(),
  component: ContentIndexPage,
});

export function ContentIndexPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} />;
}
