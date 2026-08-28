import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/life")({
  loader: () => findPublicContent({ data: { kind: "page", slug: "life" } }),
  head: () => ({
    meta: [
      { title: "School Life | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Clubs, activities, sports, STEM, ICT and student life at SLGS.",
      },
      { property: "og:url", content: absolutePublicUrl("/life") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/life") }],
  }),
  component: () => (
    <InformationalPage
      item={Route.useLoaderData()}
      title="School life"
      introduction="Clubs, activities, sports, STEM, ICT and other public school-life information will be published here."
    />
  ),
});
