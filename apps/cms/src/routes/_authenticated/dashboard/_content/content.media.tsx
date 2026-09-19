import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  IconDownload,
  IconArchive,
  IconPhoto,
  IconUpload,
  IconCheck,
  IconTrash,
  IconEdit,
  IconEye,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";

import {
  archiveCmsMedia,
  deleteCmsMedia,
  finalizeMediaUpload,
  getCmsDashboard,
  getMediaDownload,
  initiateMediaUpload,
  unarchiveCmsMedia,
  updateCmsMedia,
  type CmsPermission,
  type CmsDashboardData,
} from "../../../../cms-functions";

type CmsMediaAssetItem = CmsDashboardData["media"][number];

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
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("all");

  const [previewMedia, setPreviewMedia] = useState<CmsMediaAssetItem | null>(
    null,
  );
  const [editingMedia, setEditingMedia] = useState<CmsMediaAssetItem | null>(
    null,
  );

  const canCreateMedia =
    permissions.has("media:create:own") ||
    permissions.has("role:assign:cms") ||
    permissions.has("user:create:cms");

  const canArchive =
    permissions.has("media:archive:own") ||
    permissions.has("media:archive:club") ||
    permissions.has("media:archive:cms");

  const canManage =
    permissions.has("configuration:manage:cms") ||
    permissions.has("media:archive:cms");

  async function refresh(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setFeedback(null);
    try {
      await task();
      setFeedback(success);
      await router.invalidate();
    } catch (error: any) {
      console.error("Media operation error:", error);
      setFeedback(error?.message || "Media operation failed.");
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
          declaredMimeType: file.type as
            "image/png" | "image/jpeg" | "image/webp",
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
    return refresh(
      () => archiveCmsMedia({ data: { id } }),
      "Media asset archived.",
    );
  };

  const unarchiveMedia = (id: string) =>
    refresh(
      () => unarchiveCmsMedia({ data: { id } }),
      "Media asset restored to available status.",
    );

  const finalizeMedia = (id: string) =>
    refresh(
      () => finalizeMediaUpload({ data: { id } }),
      "Media asset verified in R2 storage and marked as available.",
    );

  const deleteMedia = (id: string) => {
    return refresh(async () => {
      await deleteCmsMedia({ data: { id } });
      if (previewMedia?.id === id) setPreviewMedia(null);
      if (editingMedia?.id === id) setEditingMedia(null);
    }, "Media asset permanently deleted.");
  };

  const handleUpdateMetadata = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMedia) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const altText = String(data.get("altText") || "").trim();
    const clubVal = String(data.get("club") || "");
    const owningClubId = clubVal ? clubVal : null;

    return refresh(async () => {
      await updateCmsMedia({
        data: {
          id: editingMedia.id,
          altText,
          owningClubId,
        },
      });
      setEditingMedia(null);
    }, "Media metadata updated successfully.");
  };

  const filteredMedia = dashboard.media.filter((asset) => {
    if (selectedStatusFilter === "all") return true;
    if (selectedStatusFilter === "rejected") {
      return asset.status === "rejected" || asset.status === "failed";
    }
    return asset.status === selectedStatusFilter;
  });

  const counts = {
    all: dashboard.media.length,
    available: dashboard.media.filter((m) => m.status === "available").length,
    pending: dashboard.media.filter((m) => m.status === "pending").length,
    rejected: dashboard.media.filter(
      (m) => m.status === "rejected" || m.status === "failed",
    ).length,
    archived: dashboard.media.filter((m) => m.status === "archived").length,
  };

  return (
    <div className="space-y-6 mx-auto p-4 md:p-6 max-w-[1600px]">
      <header className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 pb-4 border-border border-b">
        <div>
          <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs uppercase tracking-wider">
            <span>Content</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Media Library</span>
          </div>
          <h1 className="font-serif font-bold text-foreground text-2xl">
            Media Library
          </h1>
          <p className="text-muted-foreground text-sm">
            Server-mediated Cloudflare R2 storage assets with authenticated
            upload verification, live previews, and workflow status management.
          </p>
        </div>

        {canCreateMedia && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#42245f] hover:bg-[#542f7f] shadow-sm px-4 py-2 rounded-md font-semibold text-white text-xs transition-colors"
          >
            <IconUpload className="size-4" />
            <span>Upload Image</span>
          </button>
        )}
      </header>

      {feedback && (
        <div className="flex justify-between items-center bg-[#42245f]/10 p-3 border border-[#42245f]/20 rounded-lg font-medium text-[#42245f] text-xs">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 text-muted-foreground hover:text-foreground text-xs"
          >
            <IconX className="size-3.5" />
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 pb-1 border-border border-b overflow-x-auto font-medium text-xs">
        <button
          onClick={() => setSelectedStatusFilter("all")}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            selectedStatusFilter === "all"
              ? "bg-[#42245f] text-white"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => setSelectedStatusFilter("available")}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            selectedStatusFilter === "available"
              ? "bg-[#2f7d3b] text-white"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          Available ({counts.available})
        </button>
        <button
          onClick={() => setSelectedStatusFilter("pending")}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            selectedStatusFilter === "pending"
              ? "bg-amber-600 text-white"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          Pending ({counts.pending})
        </button>
        <button
          onClick={() => setSelectedStatusFilter("rejected")}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            selectedStatusFilter === "rejected"
              ? "bg-[#c83a32] text-white"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          Rejected / Failed ({counts.rejected})
        </button>
        <button
          onClick={() => setSelectedStatusFilter("archived")}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            selectedStatusFilter === "archived"
              ? "bg-muted-foreground text-background"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          Archived ({counts.archived})
        </button>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="bg-card p-12 border border-border border-dashed rounded-xl text-center">
          <IconPhoto className="opacity-50 mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="font-semibold text-foreground text-sm">
            No media assets in scope
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            No assets match the selected status filter ({selectedStatusFilter}).
          </p>
        </div>
      ) : (
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredMedia.map((asset) => (
            <article
              key={asset.id}
              className="flex flex-col justify-between space-y-3 bg-card shadow-sm p-4 border border-border hover:border-[#69439a]/30 rounded-xl transition-all"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="bg-secondary px-2 py-0.5 border rounded font-mono text-[10px] text-secondary-foreground uppercase">
                    {asset.mimeType ?? "Image"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border capitalize font-medium ${
                      asset.status === "available"
                        ? "bg-[#2f7d3b]/10 text-[#2f7d3b] border-[#2f7d3b]/20"
                        : asset.status === "pending"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : asset.status === "archived"
                            ? "bg-muted text-muted-foreground border-border"
                            : "bg-[#c83a32]/10 text-[#c83a32] border-[#c83a32]/20"
                    }`}
                  >
                    {asset.status}
                  </span>
                </div>

                {/* Media Thumbnail Container with Lightbox Click */}
                <div
                  className="group relative flex justify-center items-center bg-secondary/30 border border-border rounded-lg h-36 overflow-hidden cursor-pointer"
                  onClick={() => setPreviewMedia(asset)}
                  title="Click to view full preview"
                >
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.altText}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <IconPhoto className="size-8 text-muted-foreground/40" />
                  )}
                  <div className="absolute inset-0 flex justify-center items-center gap-1 bg-black/40 opacity-0 group-hover:opacity-100 font-semibold text-white text-xs transition-opacity">
                    <IconEye className="size-4" /> Preview
                  </div>
                </div>

                <h3
                  className="font-semibold text-foreground text-sm truncate"
                  title={asset.filename}
                >
                  {asset.filename}
                </h3>
                <p
                  className="text-muted-foreground text-xs line-clamp-2"
                  title={asset.altText}
                >
                  {asset.altText}
                </p>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>{Math.ceil(asset.byteSize / 1024)} KB</span>
                  {asset.owningClubId && (
                    <span className="max-w-[120px] text-right truncate">
                      {dashboard.clubs.find((c) => c.id === asset.owningClubId)
                        ?.name ?? "Club"}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-border border-t">
                {asset.status === "available" && (
                  <button
                    disabled={pending}
                    onClick={() => downloadMedia(asset.id)}
                    className="inline-flex flex-1 justify-center items-center gap-1 bg-background hover:bg-accent px-2 py-1.5 border border-border rounded font-medium text-xs transition-colors"
                    title="Download asset"
                  >
                    <IconDownload className="size-3.5 text-[#42245f]" />
                    <span>Download</span>
                  </button>
                )}

                {(asset.status === "pending" ||
                  asset.status === "rejected" ||
                  asset.status === "failed") && (
                  <button
                    disabled={pending}
                    onClick={() => finalizeMedia(asset.id)}
                    className="inline-flex flex-1 justify-center items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1.5 border border-amber-500/30 rounded font-medium text-amber-700 text-xs transition-colors"
                    title="Verify R2 upload and mark as available"
                  >
                    <IconCheck className="size-3.5" />
                    <span>Verify & Enable</span>
                  </button>
                )}

                {/* Edit Metadata */}
                <button
                  disabled={pending}
                  onClick={() => setEditingMedia(asset)}
                  className="bg-background hover:bg-accent p-1.5 border border-border rounded text-foreground transition-colors"
                  title="Edit metadata (Alt text / Club)"
                >
                  <IconEdit className="size-3.5" />
                </button>

                {/* Archive / Restore Button */}
                {canArchive &&
                  (asset.status === "archived" ? (
                    <button
                      disabled={pending}
                      onClick={() => unarchiveMedia(asset.id)}
                      className="bg-background hover:bg-emerald-500/10 p-1.5 border border-border rounded text-emerald-600 transition-colors"
                      title="Restore / Unarchive media asset"
                    >
                      <IconRefresh className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled={pending}
                      onClick={() => archiveMedia(asset.id)}
                      className="bg-background hover:bg-amber-500/10 p-1.5 border border-border rounded text-amber-600 transition-colors"
                      title="Archive media asset"
                    >
                      <IconArchive className="size-3.5" />
                    </button>
                  ))}

                {/* Hard Delete Button */}
                {(canManage || asset.ownerUserId === dashboard.userId) && (
                  <button
                    disabled={pending}
                    onClick={() => deleteMedia(asset.id)}
                    className="bg-background hover:bg-[#c83a32]/10 p-1.5 border border-border rounded text-[#c83a32] transition-colors"
                    title="Permanently delete asset"
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewMedia && (
        <div
          className="z-50 fixed inset-0 flex justify-center items-center bg-black/75 backdrop-blur-md p-4 animate-in duration-200 fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="flex flex-col space-y-4 bg-card shadow-2xl p-6 border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-border border-b">
              <div>
                <h2 className="max-w-xl font-serif font-bold text-foreground text-lg truncate">
                  {previewMedia.filename}
                </h2>
                <span className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
                  {previewMedia.mimeType} •{" "}
                  {Math.ceil(previewMedia.byteSize / 1024)} KB
                </span>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="hover:bg-accent p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-5" />
              </button>
            </div>

            <div className="flex flex-1 justify-center items-center bg-black/40 p-2 border border-border rounded-xl min-h-0 overflow-hidden">
              {previewMedia.url ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.altText}
                  className="rounded-lg max-w-full max-h-[60vh] object-contain"
                />
              ) : (
                <div className="p-12 text-muted-foreground text-center">
                  <IconPhoto className="opacity-30 mx-auto mb-2 size-16" />
                  <p>Image preview unavailable</p>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-border border-t text-xs">
              <div className="gap-2 grid grid-cols-1 md:grid-cols-2 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Alt Text:</strong>{" "}
                  {previewMedia.altText}
                </p>
                <p>
                  <strong className="text-foreground">Status:</strong>{" "}
                  <span className="font-semibold capitalize">
                    {previewMedia.status}
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {previewMedia.status === "available" && (
                  <button
                    onClick={() => downloadMedia(previewMedia.id)}
                    className="inline-flex items-center gap-1 bg-[#42245f] hover:bg-[#542f7f] px-4 py-2 rounded-md font-semibold text-white text-xs"
                  >
                    <IconDownload className="size-4" />
                    <span>Download Original</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="hover:bg-accent px-4 py-2 border border-border rounded-md font-medium text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingMedia && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="space-y-4 bg-card shadow-xl p-6 border border-border rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center pb-3 border-border border-b">
              <h2 className="font-serif font-bold text-foreground text-lg">
                Edit Media Details
              </h2>
              <button
                onClick={() => setEditingMedia(null)}
                className="font-bold text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMetadata} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Filename</span>
                <input
                  type="text"
                  disabled
                  value={editingMedia.filename}
                  className="bg-muted p-2 border rounded-md w-full text-muted-foreground"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Alternative Text (Alt Text)
                </span>
                <input
                  name="altText"
                  maxLength={500}
                  required
                  defaultValue={editingMedia.altText}
                  placeholder="Describe image content for accessibility"
                  className="bg-background p-2 border rounded-md w-full text-foreground"
                />
              </label>

              {dashboard.clubs.length > 0 && (
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    Club Scope (Optional)
                  </span>
                  <select
                    name="club"
                    defaultValue={editingMedia.owningClubId ?? ""}
                    className="bg-background p-2 border rounded-md w-full text-foreground"
                  >
                    <option value="">No specific club / School wide</option>
                    {dashboard.clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-border border-t">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="hover:bg-accent px-4 py-2 border border-border rounded-md font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-[#42245f] hover:bg-[#542f7f] px-4 py-2 rounded-md font-semibold text-white text-xs"
                >
                  {pending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Image Modal */}
      {showUploadModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="space-y-4 bg-card shadow-xl p-6 border border-border rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center pb-3 border-border border-b">
              <h2 className="font-serif font-bold text-foreground text-lg">
                Upload Media Asset
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="font-bold text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={uploadMedia} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Select Image File
                </span>
                <input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="bg-background p-2 border rounded-md w-full text-foreground"
                />
                <span className="block text-[10px] text-muted-foreground">
                  Allowed formats: PNG, JPEG, WebP. Max 10 MB.
                </span>
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">
                  Alternative Text (Alt Text)
                </span>
                <input
                  name="altText"
                  maxLength={500}
                  required
                  placeholder="Describe image content for accessibility"
                  className="bg-background p-2 border rounded-md w-full text-foreground"
                />
              </label>

              {dashboard.clubs.length > 0 && (
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">
                    Club Scope (Optional)
                  </span>
                  <select
                    name="club"
                    className="bg-background p-2 border rounded-md w-full text-foreground"
                  >
                    <option value="">No specific club / School wide</option>
                    {dashboard.clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-border border-t">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="hover:bg-accent px-4 py-2 border border-border rounded-md font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-[#42245f] hover:bg-[#542f7f] px-4 py-2 rounded-md font-semibold text-white text-xs"
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
