import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SLGS CMS" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-lg text-muted-foreground">
        The requested CMS page does not exist.
      </p>
      <a className="font-medium text-primary underline" href="/">
        Return to the CMS foundation
      </a>
    </main>
  );
}

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
