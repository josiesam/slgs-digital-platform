import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/_access")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
