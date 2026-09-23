import { createFileRoute } from "@tanstack/react-router";
import { EditorialListing } from "../editorial-pages";
import { listPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";

export const Route = createFileRoute("/gallery/")({
  loader: () => listPublicContent({ data: { kind: "gallery" } }),
  head: () => ({
    meta: [
      { title: "Photo Gallery | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Published photo collections and media galleries from Sierra Leone Grammar School.",
      },
      { property: "og:url", content: absolutePublicUrl("/gallery") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/gallery") }],
  }),
  component: () => (
    <EditorialListing
      items={Route.useLoaderData()}
      kind="gallery"
      title="Photo Gallery"
      introduction="Published photographic collections and visual moments from school life, academic events, and ceremonies."
    />
  ),
});
