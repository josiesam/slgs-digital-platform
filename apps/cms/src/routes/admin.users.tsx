import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: async () => {
    redirect({ to: "/dashboard" });
  },
});
