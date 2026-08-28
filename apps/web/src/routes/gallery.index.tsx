import { createFileRoute } from "@tanstack/react-router";
import { EditorialListing } from "../editorial-pages";
import { listPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/gallery/")({
  loader: () => listPublicContent({ data: { kind: "gallery" } }),
  head: () => ({
    meta: [
      { title: "Gallery | Sierra Leone Grammar School" },
      {
        name: "description",
        content: "Published galleries from Sierra Leone Grammar School.",
      },
      { property: "og:url", content: absolutePublicUrl("/gallery") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/gallery") }],
  }),
  component: () => (
    <EditorialListing
      items={Route.useLoaderData()}
      kind="gallery"
      title="Gallery"
      introduction="Published collections from school life and events."
    />
  ),
});
