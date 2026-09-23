import { createFileRoute } from "@tanstack/react-router";
import { EditorialListing } from "../editorial-pages";
import { listPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";

export const Route = createFileRoute("/events/")({
  loader: () => listPublicContent({ data: { kind: "event" } }),
  head: () => ({
    meta: [
      { title: "Upcoming Events | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Public events calendar, academic milestones, sports competitions, and school gatherings.",
      },
      { property: "og:url", content: absolutePublicUrl("/events") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/events") }],
  }),
  component: () => (
    <EditorialListing
      items={Route.useLoaderData()}
      kind="event"
      title="Upcoming Events"
      introduction="Public school events, academic ceremonies, sporting competitions, and key calendar dates."
    />
  ),
});
