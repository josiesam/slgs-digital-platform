import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { ContentIndexView } from "./content.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/announcement",
)({
  loader: () => getCmsDashboard(),
  component: ContentAnnouncementPage,
});

function ContentAnnouncementPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} filterType="announcement" />;
}

