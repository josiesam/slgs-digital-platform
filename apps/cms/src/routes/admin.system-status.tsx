import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/system-status")({
  beforeLoad: async () => {
    redirect({ to: "/dashboard/system/status" });
  },
});
