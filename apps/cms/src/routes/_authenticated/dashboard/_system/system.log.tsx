import { createFileRoute } from "@tanstack/react-router";

import { getCmsDashboard } from "../../../../cms-functions";
import { SystemAuditLogView } from "../../../../components/dashboard/system/audit-log-view";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_system/system/log",
)({
  loader: () => getCmsDashboard(),
  component: SystemAuditLogPage,
});

export function SystemAuditLogPage() {
  const dashboard = Route.useLoaderData();
  return <SystemAuditLogView dashboard={dashboard} />;
}
