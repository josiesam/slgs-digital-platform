import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PlateEditor, RichContentRenderer } from "@slgs/ui";

import {
  getEditorialContentDetails,
  transitionCmsContent,
  updateCmsContent,
} from "../../../../cms-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_editorial/editorial/$status/$contentId",
)({
  loader: async ({ params }) => {
    return await getEditorialContentDetails({ data: { id: params.contentId } });
  },
  component: EditorialContentDetailsPage,
});

function EditorialContentDetailsPage() {
  const { status, contentId } = Route.useParams();
  const data = Route.useLoaderData() as Awaited<
    ReturnType<typeof getEditorialContentDetails>
  >;
  const transitionFn = useServerFn(transitionCmsContent);
  const updateContentFn = useServerFn(updateCmsContent);
  const navigate = useNavigate();

  const {
    content,
    activeRevision,
    baseRevision,
    revisions,
    dependentRevisions,
    workflow,
  } = data;

  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(content.title);
  const [editSlug, setEditSlug] = useState(content.slug);
  const [editSummary, setEditSummary] = useState(content.summary ?? "");
  const [editBody, setEditBody] = useState(content.body ?? "");
  const [editSeoTitle, setEditSeoTitle] = useState(content.seoTitle ?? "");
  const [editSeoDescription, setEditSeoDescription] = useState(
    content.seoDescription ?? "",
  );
  const [editCanonicalPath, setEditCanonicalPath] = useState(
    content.canonicalPath ?? "",
  );

  const handleAction = async (action: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await transitionFn({
        data: {
          id: contentId,
          action: action as any,
          comment: comment || undefined,
        },
      });
      setSuccessMsg(`Workflow transition '${action}' applied successfully.`);
      await navigate({ to: "." });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to perform transition");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateContentFn({
        data: {
          id: contentId,
          changes: {
            title: editTitle,
            slug: editSlug,
            summary: editSummary || null,
            body: editBody,
            seoTitle: editSeoTitle || null,
            seoDescription: editSeoDescription || null,
            canonicalPath: editCanonicalPath || null,
          },
        },
      });
      setSuccessMsg(
        "New immutable revision snapshot created and base snapshot linked successfully!",
      );
      setIsEditing(false);
      await navigate({ to: "." });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save revision snapshot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditContent = Boolean(content);

  return (
    <div className="space-y-6 p-6">
      {/* Header & Navigation */}
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4 pb-4 border-border border-b">
        <div>
          <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
            <Link to="/dashboard/editorial" className="hover:underline">
              Editorial Board
            </Link>
            <span>/</span>
            <span className="capitalize">{status}</span>
            <span>/</span>
            <span className="font-mono text-foreground text-xs">
              {content.id}
            </span>
          </div>
          <h1 className="flex items-center gap-3 font-bold text-foreground text-2xl tracking-tight">
            {content.title}
            {content.verifiedVersion && (
              <span className="inline-flex items-center bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/20 rounded-md font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                Verified Version {content.verifiedVersion}
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canEditContent && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex justify-center items-center bg-primary hover:bg-primary/90 shadow px-3.5 py-1.5 rounded-md font-medium text-primary-foreground text-sm transition-colors"
            >
              {isEditing
                ? "Cancel Edit"
                : "✎ Edit & Create New Revision Snapshot"}
            </button>
          )}
          <Link
            to="/dashboard/editorial"
            className="inline-flex justify-center items-center bg-background hover:bg-accent shadow-sm px-3 py-1.5 border border-input rounded-md font-medium text-sm transition-colors hover:text-accent-foreground"
          >
            ← Back to Board
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 p-4 border border-destructive/20 rounded-lg font-medium text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 p-4 border border-emerald-500/20 rounded-lg font-medium text-emerald-700 dark:text-emerald-300 text-sm">
          {successMsg}
        </div>
      )}

      {/* Revision & Workflow Status Metadata Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <div className="bg-card shadow-sm p-4 border border-border rounded-lg">
          <div className="font-medium text-muted-foreground text-xs">
            Revision Label
          </div>
          <div className="mt-1 font-bold text-foreground text-lg">
            {activeRevision?.revisionLabel ??
              `1.${content.currentRevision - 1}`}
          </div>
          <div className="mt-1 font-mono text-muted-foreground text-xs">
            Rev #{content.currentRevision}
          </div>
        </div>

        <div className="bg-card shadow-sm p-4 border border-border rounded-lg">
          <div className="font-medium text-muted-foreground text-xs">
            Active Snapshot ID
          </div>
          <div
            className="mt-1 font-mono font-semibold text-foreground text-sm truncate"
            title={content.currentSnapshotId ?? "N/A"}
          >
            {content.currentSnapshotId ?? "N/A"}
          </div>
          <div className="mt-1 text-muted-foreground text-xs">
            Immutable Snapshot
          </div>
        </div>

        <div className="bg-card shadow-sm p-4 border border-border rounded-lg">
          <div className="font-medium text-muted-foreground text-xs">
            Base Snapshot ID
          </div>
          <div
            className="mt-1 font-mono font-semibold text-foreground text-sm truncate"
            title={content.currentBaseSnapshotId ?? "None (Root Snapshot)"}
          >
            {content.currentBaseSnapshotId ?? "None (Root)"}
          </div>
          <div className="mt-1 text-muted-foreground text-xs">
            Predecessor Snapshot
          </div>
        </div>

        <div className="bg-card shadow-sm p-4 border border-border rounded-lg">
          <div className="font-medium text-muted-foreground text-xs">
            Workflow State
          </div>
          <div className="mt-1">
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                content.state === "published"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : content.state === "requires_rebase"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : content.state === "rejected"
                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                      : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              {content.state}
            </span>
          </div>
          <div className="mt-1 text-muted-foreground text-xs">
            Canonical Path:{" "}
            <span className="font-mono text-foreground">
              {content.canonicalPath}
            </span>
          </div>
        </div>
      </div>

      {/* Revision Editor Form Panel (Interactive Snapshot Creation) */}
      {isEditing && (
        <form
          onSubmit={handleSaveNewRevision}
          className="space-y-4 bg-card shadow-md p-6 border border-primary/40 rounded-lg"
        >
          <div className="flex justify-between items-center pb-3 border-border border-b">
            <div>
              <h2 className="font-bold text-foreground text-lg">
                Edit Content & Generate New Revision Snapshot
              </h2>
              <p className="text-muted-foreground text-xs">
                Saving will create a new immutable revision snapshot (Revision{" "}
                {content.currentRevision + 1}) linked to base snapshot{" "}
                <span className="font-mono text-foreground">
                  {content.currentSnapshotId}
                </span>
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            <div>
              <label className="block mb-1 font-medium text-foreground text-xs">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                maxLength={240}
                className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full text-sm"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-foreground text-xs">
                URL Slug
              </label>
              <input
                type="text"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                required
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full font-mono text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 font-medium text-foreground text-xs">
                Canonical Relative Path
              </label>
              <input
                type="text"
                value={editCanonicalPath}
                onChange={(e) => setEditCanonicalPath(e.target.value)}
                placeholder="/news/my-article"
                className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full font-mono text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 font-medium text-foreground text-xs">
                Summary
              </label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                maxLength={600}
                rows={2}
                className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 font-medium text-foreground text-xs">
                Body Content
              </label>
              <PlateEditor
                value={editBody}
                onChange={setEditBody}
                placeholder="Write body content..."
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-foreground text-xs">
                SEO Title
              </label>
              <input
                type="text"
                value={editSeoTitle}
                onChange={(e) => setEditSeoTitle(e.target.value)}
                maxLength={70}
                className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full text-sm"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-foreground text-xs">
                SEO Description
              </label>
              <input
                type="text"
                value={editSeoDescription}
                onChange={(e) => setEditSeoDescription(e.target.value)}
                maxLength={170}
                className="bg-background p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-border border-t">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-background hover:bg-accent px-4 py-2 border border-input rounded-md font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 shadow px-4 py-2 rounded-md font-medium text-primary-foreground text-sm"
            >
              {isSubmitting
                ? "Generating Snapshot..."
                : "Save & Generate Revision Snapshot"}
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Snapshot Content + Actions Panel */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        {/* Left Column (2 cols): Snapshot Details & History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Snapshot Payload */}
          <div className="space-y-4 bg-card shadow-sm p-6 border border-border rounded-lg">
            <h2 className="pb-2 border-border border-b font-semibold text-foreground text-lg">
              Active Revision Snapshot Payload
            </h2>

            <div className="gap-4 grid grid-cols-2 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Type:</span>{" "}
                <span className="font-semibold text-foreground capitalize">
                  {content.type}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Slug:</span>{" "}
                <span className="font-mono text-foreground">
                  {content.slug}
                </span>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">
                  Canonical Path:
                </span>{" "}
                <span className="font-mono text-foreground">
                  {content.canonicalPath}
                </span>
              </div>
            </div>

            {content.summary && (
              <div>
                <span className="block mb-1 font-medium text-muted-foreground text-xs">
                  Summary
                </span>
                <div className="bg-muted/50 p-3 rounded-md text-foreground text-sm">
                  {content.summary}
                </div>
              </div>
            )}

            <div>
              <span className="block mb-1 font-medium text-muted-foreground text-xs">
                Body Content
              </span>
              <div className="bg-muted/30 p-4 border border-border/50 rounded-md min-h-30 text-foreground text-sm">
                <RichContentRenderer nodes={content.body} />
              </div>
            </div>
          </div>

          {/* Revision History List */}
          <div className="space-y-4 bg-card shadow-sm p-6 border border-border rounded-lg">
            <h2 className="pb-2 border-border border-b font-semibold text-foreground text-lg">
              Revision Snapshot History ({revisions.length})
            </h2>

            <div className="space-y-3">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex sm:flex-row flex-col justify-between sm:items-center gap-2 bg-muted/10 p-3 border border-border/70 rounded-md text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {rev.revisionLabel}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {rev.snapshotId}
                      </span>
                      {rev.baseSnapshotId && (
                        <span className="text-muted-foreground">
                          (Base:{" "}
                          <span className="font-mono">
                            {rev.baseSnapshotId}
                          </span>
                          )
                        </span>
                      )}
                    </div>
                    {rev.rebasedFromSnapshotId && (
                      <div className="font-mono text-amber-600">
                        Rebased from: {rev.rebasedFromSnapshotId}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-muted px-2 py-0.5 rounded font-medium capitalize">
                      {rev.status}
                    </span>
                    {rev.verifiedVersionNumber && (
                      <span className="font-semibold text-emerald-600">
                        Verified V{rev.verifiedVersionNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Base Snapshot & Comparison */}
          {baseRevision && (
            <div className="space-y-4 bg-card shadow-sm p-6 border border-border rounded-lg">
              <h2 className="flex justify-between items-center pb-2 border-border border-b font-semibold text-foreground text-lg">
                <span>Base Snapshot Details</span>
                <span className="font-mono text-muted-foreground text-xs">
                  {baseRevision.snapshotId}
                </span>
              </h2>

              <div className="gap-4 grid grid-cols-2 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">
                    Base Status:
                  </span>{" "}
                  <span className="font-semibold text-foreground capitalize">
                    {baseRevision.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Base Revision:
                  </span>{" "}
                  <span className="font-mono text-foreground">
                    {baseRevision.revisionLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-1 bg-muted/30 p-3 rounded-md text-muted-foreground text-xs">
                <div>Title: {(baseRevision.snapshot as any)?.title}</div>
                <div>
                  Canonical: {(baseRevision.snapshot as any)?.canonicalPath}
                </div>
              </div>
            </div>
          )}

          {/* Downstream / Dependent Revisions */}
          {dependentRevisions.length > 0 && (
            <div className="space-y-3 bg-card shadow-sm p-6 border border-border rounded-lg">
              <h2 className="pb-2 border-border border-b font-semibold text-foreground text-lg">
                Dependent Revisions ({dependentRevisions.length})
              </h2>

              <div className="space-y-2">
                {dependentRevisions.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex justify-between items-center bg-muted/20 p-3 border border-border rounded-md text-sm"
                  >
                    <div>
                      <span className="font-semibold text-foreground">
                        {dep.revisionLabel}
                      </span>
                      <span className="ml-2 font-mono text-muted-foreground text-xs">
                        {dep.snapshotId}
                      </span>
                    </div>
                    <span className="bg-muted px-2 py-0.5 rounded font-medium text-xs capitalize">
                      {dep.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow & Audit Log */}
          <div className="space-y-4 bg-card shadow-sm p-6 border border-border rounded-lg">
            <h2 className="pb-2 border-border border-b font-semibold text-foreground text-lg">
              Workflow Event History
            </h2>

            <div className="space-y-3">
              {workflow.length === 0 ? (
                <div className="text-muted-foreground text-sm italic">
                  No workflow events recorded yet.
                </div>
              ) : (
                workflow.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex sm:flex-row flex-col justify-between sm:items-center gap-2 bg-muted/10 p-3 border border-border/50 rounded-md text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span>{event.actorName}</span>
                        <span className="font-normal text-muted-foreground text-xs">
                          {event.fromState ? `${event.fromState} → ` : ""}
                          {event.toState}
                        </span>
                      </div>
                      {event.comment && (
                        <div className="mt-1 text-muted-foreground text-xs italic">
                          "{event.comment}"
                        </div>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(event.occurredAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Editorial Action Control Panel */}
        <div className="space-y-6">
          <div className="top-6 sticky space-y-4 bg-card shadow-sm p-6 border border-border rounded-lg">
            <h2 className="pb-2 border-border border-b font-semibold text-foreground text-lg">
              Editorial State Control
            </h2>

            <div className="space-y-3">
              <label className="block font-medium text-muted-foreground text-xs">
                Editorial Review Comment (Optional / Required for Reject)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter feedback or rejection reason..."
                className="bg-background p-2.5 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full min-h-20 text-sm"
              />

              <div className="space-y-2 pt-2">
                {content.state === "draft" && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction("submit")}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-primary-foreground text-sm transition-colors"
                  >
                    Submit for Review
                  </button>
                )}

                {content.state === "submitted" && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction("start_review")}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-white text-sm transition-colors"
                  >
                    Start Review
                  </button>
                )}

                {content.state === "in_review" && (
                  <>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleAction("complete_review")}
                      className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-white text-sm transition-colors"
                    >
                      Complete Review
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleAction("approve")}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-white text-sm transition-colors"
                    >
                      Approve Content
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleAction("reject")}
                      className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-white text-sm transition-colors"
                    >
                      Reject Revision
                    </button>
                  </>
                )}

                {content.state === "approved" && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction("publish")}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-white text-sm transition-colors"
                  >
                    Publish to Web App
                  </button>
                )}

                {content.state === "published" && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction("unpublish")}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-white text-sm transition-colors"
                  >
                    Unpublish Content
                  </button>
                )}

                {content.state === "requires_rebase" && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction("rebase")}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-white text-sm transition-colors"
                  >
                    Rebase Revision onto Valid Base
                  </button>
                )}

                {content.state === "rejected" && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction("submit")}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 shadow px-4 py-2 rounded-md w-full font-medium text-primary-foreground text-sm transition-colors"
                  >
                    Resubmit Revised Content
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
