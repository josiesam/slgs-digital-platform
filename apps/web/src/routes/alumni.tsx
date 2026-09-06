import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/alumni")({
  loader: () => findPublicContent({ data: { kind: "page", slug: "alumni" } }),
  head: () => ({
    meta: [
      { title: "Alumni | Sierra Leone Grammar School" },
      {
        name: "description",
        content: "Join our network of graduates and stay in touch.",
      },
      { property: "og:url", content: absolutePublicUrl("/alumni") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/alumni") }],
  }),
  component: () => (
    <InformationalPage
      item={Route.useLoaderData()}
      title="Alumni"
      introduction="Join our network of graduates and stay in touch."
    />
  ),
});
