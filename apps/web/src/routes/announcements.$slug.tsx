import { createFileRoute, notFound } from "@tanstack/react-router";
import { detailHead, EditorialDetail } from "../editorial-pages";
import { findPublicContent } from "../public-content";
export const Route = createFileRoute("/announcements/$slug")({
  loader: async ({ params }) => {
    const item = await findPublicContent({
      data: { kind: "announcement", slug: params.slug },
    });
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => detailHead(loaderData, "Announcement"),
  component: () => <EditorialDetail item={Route.useLoaderData()} />,
});
