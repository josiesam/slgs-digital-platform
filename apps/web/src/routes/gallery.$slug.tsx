import { createFileRoute, notFound } from "@tanstack/react-router";
import { detailHead, EditorialDetail } from "../editorial-pages";
import { findPublicContent } from "../public-content";
export const Route = createFileRoute("/gallery/$slug")({
  loader: async ({ params }) => {
    const item = await findPublicContent({
      data: { kind: "gallery", slug: params.slug },
    });
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => detailHead(loaderData, "Gallery"),
  component: () => <EditorialDetail item={Route.useLoaderData()} />,
});
