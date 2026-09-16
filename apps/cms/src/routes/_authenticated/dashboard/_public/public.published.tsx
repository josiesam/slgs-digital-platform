import { createFileRoute } from "@tanstack/react-router";
import { getCmsAdminOverview } from "../../../../admin-overview-functions";
import { PublicWebView } from "./public.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_public/public/published",
)({
  loader: () => getCmsAdminOverview(),
  component: PublicPublishedPage,
});

function PublicPublishedPage() {
  const data = Route.useLoaderData();
  return <PublicWebView data={data} activeTab="overview" />;
}
