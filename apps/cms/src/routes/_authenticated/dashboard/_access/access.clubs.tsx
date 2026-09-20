import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { IconFolder, IconPlus, IconShield } from "@tabler/icons-react";

import {
  createCmsClub,
  getCmsDashboard,
  updateCmsClub,
  type CmsPermission,
} from "../../../../cms-functions";
import { AccessClubsView } from "../../../../components/dashboard/access/club-view";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_access/access/clubs",
)({
  loader: () => getCmsDashboard(),
  component: AccessClubsRoute,
});

function AccessClubsRoute() {
  const dashboard = Route.useLoaderData();

  return <AccessClubsView dashboard={dashboard} />;
}
