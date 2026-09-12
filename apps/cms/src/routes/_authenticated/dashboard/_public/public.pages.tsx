import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/_public/public/pages")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_dashboard/_content/content"!</div>;
}
