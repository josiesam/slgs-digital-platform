import { createFileRoute } from "@tanstack/react-router";
import { getCmsDashboard } from "../../../../cms-functions";
import { SystemAuditLogView } from "./system.log";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_system/system/",
)({
  loader: () => getCmsDashboard(),
  component: SystemIndexPage,
});

function SystemIndexPage() {
  const dashboard = Route.useLoaderData();
  return <SystemAuditLogView dashboard={dashboard} />;
}

