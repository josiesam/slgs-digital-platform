import { createFileRoute } from "@tanstack/react-router";
import { EditorialListing } from "../editorial-pages";
import { listPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/events/")({
  loader: () => listPublicContent({ data: { kind: "event" } }),
  head: () => ({
    meta: [
      { title: "Events | Sierra Leone Grammar School" },
      {
        name: "description",
        content: "Published public events from Sierra Leone Grammar School.",
      },
      { property: "og:url", content: absolutePublicUrl("/events") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/events") }],
  }),
  component: () => (
    <EditorialListing
      items={Route.useLoaderData()}
      kind="event"
      title="Events"
      introduction="Upcoming and recent public school events."
    />
  ),
});
