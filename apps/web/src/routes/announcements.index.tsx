import { createFileRoute } from "@tanstack/react-router";
import { EditorialListing } from "../editorial-pages";
import { listPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/announcements/")({
  loader: () => listPublicContent({ data: { kind: "announcement" } }),
  head: () => ({
    meta: [
      { title: "Announcements | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Published public announcements from Sierra Leone Grammar School.",
      },
      { property: "og:url", content: absolutePublicUrl("/announcements") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/announcements") }],
  }),
  component: () => (
    <EditorialListing
      items={Route.useLoaderData()}
      kind="announcement"
      title="Announcements"
      introduction="Official public notices and updates."
    />
  ),
});
