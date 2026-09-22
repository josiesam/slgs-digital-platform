import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { IconPlus, IconShield, IconUsers } from "@tabler/icons-react";

import {
  assignCmsRole,
  createCustomCmsRole,
  getCmsDashboard,
  setCustomCmsRoleActive,
  type CmsPermission,
  type CmsDashboardData,
} from "../../../../cms-functions";
import { AccessRolesView } from "../../../../components/dashboard/access/role-view";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_access/access/roles",
)({
  loader: () => getCmsDashboard(),
  component: AccessRolesPage,
});

function AccessRolesPage() {
  const dashboard = Route.useLoaderData();
  return <AccessRolesView dashboard={dashboard} />;
}
