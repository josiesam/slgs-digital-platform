import { createFileRoute } from "@tanstack/react-router";
import { getCmsAdminOverview } from "../../../../admin-overview-functions";
import { PublicWebView } from "../../../../components/dashboard/public/public-web-view";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_public/public/pages",
)({
  loader: () => getCmsAdminOverview(),
  component: PublicPagesPage,
});

function PublicPagesPage() {
  const data = Route.useLoaderData();
  return <PublicWebView data={data} activeTab="urls" />;
}
