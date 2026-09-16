import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/content")({
  beforeLoad: async () => {
    redirect({ to: "/dashboard/content" });
  },
});
