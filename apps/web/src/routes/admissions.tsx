import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/admissions")({
  loader: () =>
    findPublicContent({ data: { kind: "page", slug: "admissions" } }),
  head: () => ({
    meta: [
      { title: "Admissions | Sierra Leone Grammar School" },
      {
        name: "description",
        content: "Official SLGS admissions information and guidance.",
      },
      { property: "og:url", content: absolutePublicUrl("/admissions") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/admissions") }],
  }),
  component: () => (
    <InformationalPage
      item={Route.useLoaderData()}
      title="Admissions"
      introduction="Official requirements, application steps, important dates, documents and FAQs will be published here."
    />
  ),
});
