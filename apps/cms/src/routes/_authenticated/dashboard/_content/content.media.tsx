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
  IconReplace,
} from "@tabler/icons-react";

import {
  archiveCmsMedia,
  deleteCmsMedia,
  finalizeMediaUpload,
  finalizeMediaReplacement,
  getCmsDashboard,
  getMediaDownload,
  initiateMediaUpload,
  initiateMediaReplacement,
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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  const [previewMedia, setPreviewMedia] = useState<CmsMediaAssetItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<CmsMediaAssetItem | null>(null);
  const [replacingMedia, setReplacingMedia] = useState<CmsMediaAssetItem | null>(null);

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

  const replaceMedia = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replacingMedia) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File)) return;

    return refresh(async () => {
      const signatureBytes = Array.from(
        new Uint8Array(await file.slice(0, 32).arrayBuffer()),
      );
      const initiated = await initiateMediaReplacement({
        data: {
          id: replacingMedia.id,
          filename: file.name,
          declaredMimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
          byteSize: file.size,
          signatureBytes,
        },
      });

      const response = await fetch(initiated.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": initiated.contentType },
        body: file,
      });

      if (!response.ok) throw new Error("Object storage replacement upload failed.");

      await finalizeMediaReplacement({
        data: {
          id: replacingMedia.id,
          newStorageKey: initiated.newStorageKey,
          originalFilename: initiated.originalFilename,
          normalizedFilename: initiated.normalizedFilename,
          declaredMimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
          detectedMimeType: initiated.contentType as "image/png" | "image/jpeg" | "image/webp",
          byteSize: initiated.byteSize,
        },
      });

      form.reset();
      setReplacingMedia(null);
    }, "Media file successfully replaced and verified in storage.");
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
    if (
      !window.confirm(
        "PERMANENTLY DELETE this media asset? This action will remove the object from Cloudflare R2 storage and database, and cannot be undone.",
      )
    ) {
      return;
    }
    return refresh(async () => {
      await deleteCmsMedia({ data: { id } });
      if (previewMedia?.id === id) setPreviewMedia(null);
      if (editingMedia?.id === id) setEditingMedia(null);
      if (replacingMedia?.id === id) setReplacingMedia(null);
    }, "Media asset permanently deleted.");
  };

  const handleUpdateMetadata = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMedia) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const filename = String(data.get("filename") || "").trim();
    const altText = String(data.get("altText") || "").trim();
    const clubVal = String(data.get("club") || "");
    const owningClubId = clubVal ? clubVal : null;

    return refresh(async () => {
      await updateCmsMedia({
        data: {
          id: editingMedia.id,
          filename,
          altText,
          owningClubId,
        },
      });
      setEditingMedia(null);
    }, "Media details and filename updated successfully.");
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
            Server-mediated Cloudflare R2 storage assets with authenticated upload verification, file replacement, live previews, and workflow status management.
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
        <div className="p-3 rounded-lg bg-[#42245f]/10 border border-[#42245f]/20 text-[#42245f] text-xs font-medium flex items-center justify-between">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs p-1"
          >
            <IconX className="size-3.5" />
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs font-medium">
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
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
          <IconPhoto className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-foreground">No media assets in scope</p>
          <p className="text-xs text-muted-foreground mt-1">
            No assets match the selected status filter ({selectedStatusFilter}).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((asset) => (
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
                  className="h-36 rounded-lg bg-secondary/30 border border-border overflow-hidden cursor-pointer relative group flex items-center justify-center"
                  onClick={() => setPreviewMedia(asset)}
                  title="Click to view full preview"
                >
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.altText}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <IconPhoto className="size-8 text-muted-foreground/40" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <IconEye className="size-4" /> Preview
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-foreground truncate" title={asset.filename}>
                  {asset.filename}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2" title={asset.altText}>
                  {asset.altText}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{Math.ceil(asset.byteSize / 1024)} KB</span>
                  {asset.owningClubId && (
                    <span className="truncate max-w-[120px] text-right">
                      {dashboard.clubs.find((c) => c.id === asset.owningClubId)?.name ?? "Club"}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-border flex items-center gap-1.5 flex-wrap">
                {asset.status === "available" && (
                  <button
                    disabled={pending}
                    onClick={() => downloadMedia(asset.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded border border-border bg-background hover:bg-accent text-xs font-medium transition-colors"
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
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 text-xs font-medium transition-colors"
                    title="Verify R2 upload and mark as available"
                  >
                    <IconCheck className="size-3.5" />
                    <span>Verify & Enable</span>
                  </button>
                )}

                {/* Replace File Button */}
                <button
                  disabled={pending}
                  onClick={() => setReplacingMedia(asset)}
                  className="p-1.5 rounded border border-border bg-background hover:bg-blue-500/10 text-blue-600 transition-colors"
                  title="Replace media file"
                >
                  <IconReplace className="size-3.5" />
                </button>

                {/* Edit Details & Filename */}
                <button
                  disabled={pending}
                  onClick={() => setEditingMedia(asset)}
                  className="p-1.5 rounded border border-border bg-background hover:bg-accent text-foreground transition-colors"
                  title="Edit details (Filename / Alt text / Club)"
                >
                  <IconEdit className="size-3.5" />
                </button>

                {/* Archive / Restore Button */}
                {canArchive && (
                  asset.status === "archived" ? (
                    <button
                      disabled={pending}
                      onClick={() => unarchiveMedia(asset.id)}
                      className="p-1.5 rounded border border-border bg-background hover:bg-emerald-500/10 text-emerald-600 transition-colors"
                      title="Restore / Unarchive media asset"
                    >
                      <IconRefresh className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled={pending}
                      onClick={() => archiveMedia(asset.id)}
                      className="p-1.5 rounded border border-border bg-background hover:bg-amber-500/10 text-amber-600 transition-colors"
                      title="Archive media asset"
                    >
                      <IconArchive className="size-3.5" />
                    </button>
                  )
                )}

                {/* Hard Delete Button */}
                {(canManage || asset.ownerUserId === dashboard.userId) && (
                  <button
                    disabled={pending}
                    onClick={() => deleteMedia(asset.id)}
                    className="p-1.5 rounded border border-border bg-background hover:bg-[#c83a32]/10 text-[#c83a32] transition-colors"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-serif font-bold text-foreground truncate max-w-xl">
                  {previewMedia.filename}
                </h2>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                  {previewMedia.mimeType} • {Math.ceil(previewMedia.byteSize / 1024)} KB
                </span>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <IconX className="size-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center bg-black/40 rounded-xl overflow-hidden border border-border p-2">
              {previewMedia.url ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.altText}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <IconPhoto className="size-16 mx-auto mb-2 opacity-30" />
                  <p>Image preview unavailable</p>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs border-t border-border pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                <p><strong className="text-foreground">Alt Text:</strong> {previewMedia.altText}</p>
                <p><strong className="text-foreground">Status:</strong> <span className="capitalize font-semibold">{previewMedia.status}</span></p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {previewMedia.status === "available" && (
                  <button
                    onClick={() => downloadMedia(previewMedia.id)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-[#42245f] hover:bg-[#542f7f] text-white text-xs font-semibold"
                  >
                    <IconDownload className="size-4" />
                    <span>Download Original</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="px-4 py-2 rounded-md border border-border hover:bg-accent text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details & Filename Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-foreground">Edit Media Details</h2>
              <button
                onClick={() => setEditingMedia(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMetadata} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">File Name / Title</span>
                <input
                  name="filename"
                  type="text"
                  required
                  maxLength={255}
                  defaultValue={editingMedia.filename}
                  placeholder="e.g. school-sports-day-2026.png"
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Alternative Text (Alt Text)</span>
                <input
                  name="altText"
                  maxLength={500}
                  required
                  defaultValue={editingMedia.altText}
                  placeholder="Describe image content for accessibility"
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                />
              </label>

              {dashboard.clubs.length > 0 && (
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">Club Scope (Optional)</span>
                  <select
                    name="club"
                    defaultValue={editingMedia.owningClubId ?? ""}
                    className="w-full p-2 border rounded-md bg-background text-foreground"
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

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 rounded-md border border-border hover:bg-accent text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-md bg-[#42245f] hover:bg-[#542f7f] text-white text-xs font-semibold"
                >
                  {pending ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Media File Modal */}
      {replacingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-foreground">Replace Media File</h2>
              <button
                onClick={() => setReplacingMedia(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 bg-secondary/30 p-2.5 rounded-lg border border-border">
              <p><strong className="text-foreground">Asset ID:</strong> {replacingMedia.id}</p>
              <p><strong className="text-foreground">Current File:</strong> {replacingMedia.filename}</p>
            </div>

            <form onSubmit={replaceMedia} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Select Replacement Image File</span>
                <input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Allowed formats: PNG, JPEG, WebP. Max 10 MB. This will upload a new image to object storage and update the asset.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReplacingMedia(null)}
                  className="px-4 py-2 rounded-md border border-border hover:bg-accent text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  {pending ? "Replacing..." : "Upload & Replace"}
                </button>
              </div>
            </form>
          </div>
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
                  className="w-full p-2 border rounded-md bg-background text-foreground"
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
                  className="w-full p-2 border rounded-md bg-background text-foreground"
                />
              </label>

              {dashboard.clubs.length > 0 && (
                <label className="block space-y-1">
                  <span className="font-semibold text-foreground">Club Scope (Optional)</span>
                  <select name="club" className="w-full p-2 border rounded-md bg-background text-foreground">
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
