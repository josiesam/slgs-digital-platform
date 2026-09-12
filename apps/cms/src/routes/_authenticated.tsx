import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCurrentCmsIdentity } from "../access";
import { getCmsAdminOverview } from "../admin-overview-functions";
import Sidebar02 from "../components/sidebar-02";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    try {
      await getCurrentCmsIdentity();
    } catch {
      throw redirect({
        to: "/login",
      });
    }
  },

  loader: () => getCmsAdminOverview(),

  component: AuthenticatedLayout2,
});

function AuthenticatedLayout2() {
  return <Sidebar02 />;
}
