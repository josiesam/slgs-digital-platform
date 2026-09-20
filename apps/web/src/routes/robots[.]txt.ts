import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const origin = (
          process.env.PUBLIC_SITE_URL ?? "http://localhost:3001"
        ).replace(/\/$/, "");
        return new Response(
          `User-agent: *\nAllow: /\nDisallow: /_server/\nSitemap: ${origin}/sitemap.xml\n`,
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});
