import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/academics")({
  loader: () =>
    findPublicContent({ data: { kind: "page", slug: "academics" } }),
  head: () => ({
    meta: [
      { title: "Academics | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Public information about SLGS academic programmes and learning.",
      },
      { property: "og:url", content: absolutePublicUrl("/academics") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/academics") }],
  }),
  component: () => (
    <InformationalPage
      item={Route.useLoaderData()}
      title="Academics"
      introduction="Public programmes, departments, subjects, curriculum information and achievements will be published here. Private academic records never appear on this site."
    />
  ),
});
