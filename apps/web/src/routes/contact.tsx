import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/contact")({
  loader: () => findPublicContent({ data: { kind: "page", slug: "contact" } }),
  head: () => ({
    meta: [
      { title: "Contact | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Official contact and location information for Sierra Leone Grammar School.",
      },
      { property: "og:url", content: absolutePublicUrl("/contact") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/contact") }],
  }),
  component: () => (
    <InformationalPage
      item={Route.useLoaderData()}
      title="Contact SLGS"
      introduction="Official address, phone, email, opening information and enquiry guidance are awaiting school approval and CMS publication."
    />
  ),
});
