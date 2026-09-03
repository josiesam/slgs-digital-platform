import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/alumni")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/alumni"!</div>;
}
