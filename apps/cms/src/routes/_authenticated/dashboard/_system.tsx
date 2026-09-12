import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/_system")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
