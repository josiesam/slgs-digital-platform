import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { ContentIndexView } from "./content.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/gallery",
)({
  loader: () => getCmsDashboard(),
  component: ContentGalleryPage,
});

function ContentGalleryPage() {
  const dashboard = Route.useLoaderData();
  return <ContentIndexView dashboard={dashboard} filterType="gallery" />;
}

