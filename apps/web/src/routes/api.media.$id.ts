import { createFileRoute } from "@tanstack/react-router";
import { fetchPublicMediaAsset } from "@slgs/public-content/server";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const result = await fetchPublicMediaAsset(process.env, params.id);
          if (!result) {
            return new Response("Public media not found or not published", {
              status: 404,
            });
          }
          console.log("results: ", result);
          return new Response(result.body, {
            headers: {
              "Content-Type": result.mimeType,
              ...(result.byteSize !== null
                ? { "Content-Length": String(result.byteSize) }
                : {}),
              ...(result.etag ? { ETag: result.etag } : {}),
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (error) {
          console.error("Media storage retrieval error:", error);
          return new Response("Media storage retrieval error", { status: 500 });
        }
      },
    },
  },
});
