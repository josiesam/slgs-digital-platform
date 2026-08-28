import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPendingComponent: () => (
      <main className="page-container" aria-busy="true">
        <p className="eyebrow">Loading</p>
        <h1>Preparing public content…</h1>
      </main>
    ),
    defaultErrorComponent: () => (
      <main className="page-container">
        <p className="eyebrow">Content unavailable</p>
        <h1>We could not load this page</h1>
        <p>
          Please try again later. No private diagnostic information is shown.
        </p>
      </main>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
