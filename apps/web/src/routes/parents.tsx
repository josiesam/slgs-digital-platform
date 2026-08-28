import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/parents")({
  loader: () => findPublicContent({ data: { kind: "page", slug: "parents" } }),
  head: () => ({
    meta: [
      { title: "Parents | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Public guidance, communications and resources for SLGS parents.",
      },
      { property: "og:url", content: absolutePublicUrl("/parents") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/parents") }],
  }),
  component: () => (
    <InformationalPage
      item={Route.useLoaderData()}
      title="Parents"
      introduction="Public guidance, school communications, policies, calendars and useful resources will be published here. No private parent or student records are exposed."
    />
  ),
});
