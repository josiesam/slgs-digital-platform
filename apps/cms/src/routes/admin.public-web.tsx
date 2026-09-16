import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/public-web")({
  beforeLoad: async () => {
    redirect({ to: "/dashboard/public" });
  },
});
