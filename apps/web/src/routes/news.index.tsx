import { createFileRoute } from "@tanstack/react-router";
import { EditorialListing } from "../editorial-pages";
import { listPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";

export const Route = createFileRoute("/news/")({
  loader: () => listPublicContent({ data: { kind: "article" } }),
  head: () => ({
    meta: [
      { title: "News & Stories | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Published news updates, academic achievements, and community stories from Sierra Leone Grammar School.",
      },
      { property: "og:url", content: absolutePublicUrl("/news") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/news") }],
  }),
  component: () => (
    <EditorialListing
      items={Route.useLoaderData()}
      kind="article"
      title="School News"
      introduction="Published stories, academic highlights, and official updates from the SLGS community."
    />
  ),
});
