import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { AccessRolesView } from "./access.roles";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_access/access/",
)({
  loader: () => getCmsDashboard(),
  component: AccessIndexPage,
});

function AccessIndexPage() {
  const dashboard = Route.useLoaderData();
  return <AccessRolesView dashboard={dashboard} />;
}

