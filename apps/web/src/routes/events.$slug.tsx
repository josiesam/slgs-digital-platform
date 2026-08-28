import { createFileRoute, notFound } from "@tanstack/react-router";
import { detailHead, EditorialDetail } from "../editorial-pages";
import { findPublicContent } from "../public-content";
export const Route = createFileRoute("/events/$slug")({
  loader: async ({ params }) => {
    const item = await findPublicContent({
      data: { kind: "event", slug: params.slug },
    });
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => detailHead(loaderData, "Event"),
  component: () => <EditorialDetail item={Route.useLoaderData()} />,
});
