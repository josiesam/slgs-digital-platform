import { createFileRoute } from "@tanstack/react-router";
import { getCmsAdminOverview } from "../../../../admin-overview-functions";
import { PublicWebView } from "./public.index";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_public/public/navigation",
)({
  loader: () => getCmsAdminOverview(),
  component: PublicNavigationPage,
});

function PublicNavigationPage() {
  const data = Route.useLoaderData();
  return <PublicWebView data={data} />;
}

