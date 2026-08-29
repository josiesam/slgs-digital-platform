import { useState, type FormEvent } from "react";

export type CmsWorkflowAction =
  | "submit"
  | "start_review"
  | "complete_review"
  | "reject"
  | "approve"
  | "publish"
  | "unpublish";

type WorkflowContent = {
  readonly id: string;
  readonly state:
    "draft" | "submitted" | "in_review" | "rejected" | "approved" | "published";
  readonly authorUserId: string;
  readonly reviewedAt: string | null;
};

export function WorkflowActions({
  content,
  currentUserId,
  permissions,
  pending,
  onAction,
}: {
  readonly content: WorkflowContent;
  readonly currentUserId: string;
  readonly permissions: ReadonlySet<string>;
  readonly pending: boolean;
  readonly onAction: (action: CmsWorkflowAction, comment?: string) => void;
}) {
  const [comment, setComment] = useState("");
  const independentActor = content.authorUserId !== currentUserId;
  const submitComment = (
    event: FormEvent<HTMLFormElement>,
    action: "complete_review" | "reject",
  ) => {
    event.preventDefault();
    onAction(action, comment);
  };

  return (
    <div className="cms-actions" aria-label="Workflow actions">
      {content.authorUserId === currentUserId &&
      ["draft", "rejected"].includes(content.state) ? (
        <button
          disabled={pending}
          onClick={() => onAction("submit")}
          type="button"
        >
          Submit
        </button>
      ) : null}
      {content.state === "submitted" &&
      permissions.has("content:review:assigned") &&
      independentActor ? (
        <button
          disabled={pending}
          onClick={() => onAction("start_review")}
          type="button"
        >
          Start review
        </button>
      ) : null}
      {content.state === "in_review" && independentActor ? (
        <>
          {(permissions.has("content:review:assigned") ||
            permissions.has("content:reject:assigned")) && (
            <label className="cms-workflow-comment">
              Review or rejection comment
              <textarea
                value={comment}
                maxLength={2000}
                onChange={(event) => setComment(event.currentTarget.value)}
                required
                rows={3}
              />
            </label>
          )}
          {permissions.has("content:review:assigned") ? (
            <form onSubmit={(event) => submitComment(event, "complete_review")}>
              <button disabled={pending || !comment.trim()} type="submit">
                Complete review
              </button>
            </form>
          ) : null}
          {permissions.has("content:reject:assigned") ? (
            <form onSubmit={(event) => submitComment(event, "reject")}>
              <button
                className="secondary"
                disabled={pending || !comment.trim()}
                type="submit"
              >
                Reject
              </button>
            </form>
          ) : null}
          {permissions.has("content:approve:assigned") && content.reviewedAt ? (
            <button
              disabled={pending}
              onClick={() => onAction("approve")}
              type="button"
            >
              Approve
            </button>
          ) : null}
        </>
      ) : null}
      {content.state === "approved" &&
      permissions.has("content:publish:approved") ? (
        <button
          disabled={pending}
          onClick={() => onAction("publish")}
          type="button"
        >
          Publish
        </button>
      ) : null}
      {content.state === "published" &&
      permissions.has("content:unpublish:published") ? (
        <button
          className="secondary"
          disabled={pending}
          onClick={() => onAction("unpublish")}
          type="button"
        >
          Unpublish
        </button>
      ) : null}
    </div>
  );
}
