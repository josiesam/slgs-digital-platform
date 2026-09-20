import { createFileRoute } from "@tanstack/react-router";
import { getSitemapContent } from "../public-content";

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character]!,
  );
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = (
          process.env.PUBLIC_SITE_URL ?? "http://slgs.edu.sl"
        ).replace(/\/$/, "");
        const content = await getSitemapContent();
        const fixed = [
          "",
          "about",
          "admissions",
          "academics",
          "life",
          "parents",
          "news",
          "events",
          "gallery",
          "contact",
        ];
        const dynamic = [
          ...content.articles.map((item) => `news/${item.slug}`),
          ...content.events.map((item) => `events/${item.slug}`),
          ...content.galleries.map((item) => `gallery/${item.slug}`),
          ...content.announcements.map((item) => `announcements/${item.slug}`),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...fixed, ...dynamic].map((path) => `<url><loc>${escapeXml(`${origin}/${path}`)}</loc></url>`).join("")}</urlset>`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=60",
          },
        });
      },
    },
  },
});
