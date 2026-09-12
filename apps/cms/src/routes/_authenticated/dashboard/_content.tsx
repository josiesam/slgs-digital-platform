import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/_content")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
