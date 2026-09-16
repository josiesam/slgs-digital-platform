import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  IconDownload,
  IconArchive,
  IconPhoto,
  IconUpload,
} from "@tabler/icons-react";

import {
  archiveCmsMedia,
  finalizeMediaUpload,
  getCmsDashboard,
  getMediaDownload,
  initiateMediaUpload,
  type CmsPermission,
} from "../../../../cms-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_content/content/media",
)({
  loader: () => getCmsDashboard(),
  component: MediaLibraryPage,
});

export function MediaLibraryPage() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  const permissions = new Set<CmsPermission>(dashboard.permissions);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const canCreateMedia =
    permissions.has("media:create:own") ||
    permissions.has("role:assign:cms") ||
    permissions.has("user:create:cms");

  const canArchive =
    permissions.has("media:archive:own") ||
    permissions.has("media:archive:club") ||
    permissions.has("media:archive:cms");

  async function refresh(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setFeedback(null);
    try {
      await task();
      setFeedback(success);
      await router.invalidate();
    } catch {
      setFeedback("Media operation failed. Check file constraints and authorization.");
    } finally {
      setPending(false);
    }
  }

  const uploadMedia = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File)) return;

    return refresh(async () => {
      const signatureBytes = Array.from(
        new Uint8Array(await file.slice(0, 32).arrayBuffer()),
      );
      const initiated = await initiateMediaUpload({
        data: {
          filename: file.name,
          declaredMimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
          byteSize: file.size,
          signatureBytes,
          altText: String(data.get("altText")),
          owningClubId: String(data.get("club") || "") || undefined,
        },
      });

      const response = await fetch(initiated.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": initiated.contentType },
        body: file,
      });

      if (!response.ok) throw new Error("Object storage upload failed.");
      await finalizeMediaUpload({ data: { id: initiated.id } });
      form.reset();
      setShowUploadModal(false);
    }, "Image successfully uploaded and verified in R2 storage.");
  };

  const downloadMedia = (id: string) =>
    refresh(async () => {
      const result = await getMediaDownload({ data: { id } });
      window.location.assign(result.downloadUrl);
    }, "Secure download link generated.");

  const archiveMedia = (id: string) => {
    if (
      !window.confirm(
        "Archive this media asset? It will no longer be available for new content.",
      )
    ) {
      return;
    }
    return refresh(
      () => archiveCmsMedia({ data: { id } }),
      "Media asset archived.",
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>Content</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Media Library</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            Server-mediated Cloudflare R2 storage assets with authenticated download authorization.
          </p>
        </div>

        {canCreateMedia && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-[#42245f] hover:bg-[#542f7f] transition-colors shadow-sm"
          >
            <IconUpload className="size-4" />
            <span>Upload Image</span>
          </button>
        )}
      </header>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#42245f]/10 border border-[#42245f]/20 text-[#42245f] text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Media Grid */}
      {dashboard.media.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
          <IconPhoto className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-foreground">No media assets in scope</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload images (PNG, JPEG, WebP) within your club or organization scope.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {dashboard.media.map((asset) => (
            <article
              key={asset.id}
              className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-3 hover:border-[#69439a]/30 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground border">
                    {asset.mimeType ?? "Image"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border capitalize ${
                      asset.status === "available"
                        ? "bg-[#2f7d3b]/10 text-[#2f7d3b] border-[#2f7d3b]/20"
                        : "bg-[#c83a32]/10 text-[#c83a32] border-[#c83a32]/20"
                    }`}
                  >
                    {asset.status}
                  </span>
                </div>

                <div className="h-32 rounded-lg bg-secondary/30 flex items-center justify-center border border-border">
                  <IconPhoto className="size-8 text-muted-foreground/40" />
                </div>

                <h3 className="font-semibold text-sm text-foreground truncate" title={asset.filename}>
                  {asset.filename}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2" title={asset.altText}>
                  {asset.altText}
                </p>
                <span className="text-[11px] text-muted-foreground block">
                  {Math.ceil(asset.byteSize / 1024)} KB
                </span>
              </div>

              <div className="pt-2 border-t border-border flex items-center gap-2">
                {asset.status === "available" && (
                  <button
                    disabled={pending}
                    onClick={() => downloadMedia(asset.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded border border-border bg-background hover:bg-accent text-xs font-medium transition-colors"
                  >
                    <IconDownload className="size-3.5 text-[#42245f]" />
                    <span>Download</span>
                  </button>
                )}

                {canArchive && asset.status !== "archived" && (
                  <button
                    disabled={pending}
                    onClick={() => archiveMedia(asset.id)}
                    className="p-1.5 rounded border border-border bg-background hover:bg-[#c83a32]/10 text-[#c83a32] transition-colors"
                    title="Archive media"
                  >
                    <IconArchive className="size-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Upload Image Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-foreground">Upload Media Asset</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={uploadMedia} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Select Image File</span>
                <input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="w-full p-2 border rounded-md bg-background"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Allowed formats: PNG, JPEG, WebP. Max 10 MB.
                </span>
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Alternative Text (Alt Text)</span>
                <input
                  name="altText"
                  maxLength={500}
                  required
                  placeholder="Describe image content for accessibility"
                  className="w-full p-2 border rounded-md bg-background"
                />
              </label>

              {dashboard.clubs.length > 0 && (
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">Club Scope (Optional)</span>
                  <select name="club" className="w-full p-2 border rounded-md bg-background">
                    <option value="">No specific club / School wide</option>
                    {dashboard.clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-md border border-border hover:bg-accent text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-md bg-[#42245f] hover:bg-[#542f7f] text-white text-xs font-semibold"
                >
                  {pending ? "Uploading..." : "Upload & Verify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
