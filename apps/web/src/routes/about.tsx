import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/about")({
  loader: () => findPublicContent({ data: { kind: "page", slug: "about" } }),
  head: () => ({
    meta: [
      { title: "About | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "School overview, mission, vision, values, history and leadership information.",
      },
      { property: "og:url", content: absolutePublicUrl("/about") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/about") }],
  }),
  component: () => (
    <InformationalPage
      item={Route.useLoaderData()}
      title="About SLGS"
      introduction="School overview, mission, vision, values, history and leadership information will be published here."
    />
  ),
});
