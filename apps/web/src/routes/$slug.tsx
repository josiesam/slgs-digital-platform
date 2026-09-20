import { createFileRoute, notFound } from "@tanstack/react-router";
import { InformationalPage } from "../informational-page";
import { findPublicContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    let item = await findPublicContent({
      data: { kind: "page", slug: params.slug },
    });
    if (!item) {
      const fallbackKinds = [
        "announcement",
        "article",
        "event",
        "gallery",
      ] as const;
      for (const kind of fallbackKinds) {
        const candidate = await findPublicContent({
          data: { kind, slug: params.slug },
        });
        if (candidate) {
          item = candidate;
          break;
        }
      }
    }
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Page"} | Sierra Leone Grammar School` },
      {
        name: "description",
        content:
          loaderData?.seoDescription ??
          loaderData?.summary ??
          "Sierra Leone Grammar School public page.",
      },
      {
        property: "og:url",
        content: absolutePublicUrl(
          loaderData?.canonicalPath ?? `/${loaderData?.slug ?? ""}`,
        ),
      },
    ],
    links: [
      {
        rel: "canonical",
        href: absolutePublicUrl(
          loaderData?.canonicalPath ?? `/${loaderData?.slug ?? ""}`,
        ),
      },
    ],
  }),
  component: DynamicPage,
});

function DynamicPage() {
  const item = Route.useLoaderData();
  return (
    <InformationalPage
      item={item}
      title={item.title}
      introduction={item.summary ?? ""}
    />
  );
}
