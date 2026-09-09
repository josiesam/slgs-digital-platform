import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkflowActions } from "./workflow-actions";

describe("CMS workflow actions", () => {
  it("does not offer approval until an independent review is complete", () => {
    const base = {
      id: "content-1",
      state: "in_review" as const,
      authorUserId: "author",
      reviewedAt: null,
    };
    const permissions = new Set(["content:approve:assigned"]);

    const beforeReview = renderToStaticMarkup(
      <WorkflowActions
        content={base}
        currentUserId="approver"
        permissions={permissions}
        pending={false}
        onAction={vi.fn()}
      />,
    );
    const afterReview = renderToStaticMarkup(
      <WorkflowActions
        content={{ ...base, reviewedAt: "2026-08-28T12:00:00.000Z" }}
        currentUserId="approver"
        permissions={permissions}
        pending={false}
        onAction={vi.fn()}
      />,
    );

    expect(beforeReview).not.toContain("Approve");
    expect(afterReview).toContain("Approve");
  });

  it.each([
    ["Editor", new Set<string>(), "draft", "author", "author", "Submit"],
    [
      "Reviewer",
      new Set(["content:review:assigned"]),
      "submitted",
      "author",
      "reviewer",
      "Start review",
    ],
    [
      "Publisher",
      new Set(["content:publish:approved"]),
      "approved",
      "author",
      "publisher",
      "Publish",
    ],
  ])(
    "offers the %s only its state-appropriate action",
    (_, permissions, state, authorUserId, currentUserId, expected) => {
      const markup = renderToStaticMarkup(
        <WorkflowActions
          content={{
            id: "content-1",
            state: state as "draft" | "submitted" | "approved",
            authorUserId,
            reviewedAt: null,
          }}
          currentUserId={currentUserId}
          permissions={permissions}
          pending={false}
          onAction={vi.fn()}
        />,
      );

      expect(markup).toContain(expected);
    },
  );

  it("does not offer review or approval actions to the author", () => {
    const markup = renderToStaticMarkup(
      <WorkflowActions
        content={{
          id: "content-1",
          state: "in_review",
          authorUserId: "author",
          reviewedAt: "2026-08-28T12:00:00.000Z",
        }}
        currentUserId="author"
        permissions={
          new Set([
            "content:review:assigned",
            "content:reject:assigned",
            "content:approve:assigned",
          ])
        }
        pending={false}
        onAction={vi.fn()}
      />,
    );

    expect(markup).not.toContain("Complete review");
    expect(markup).not.toContain("Reject");
    expect(markup).not.toContain("Approve");
  });

  it("requires a meaningful comment before review completion or rejection", () => {
    const markup = renderToStaticMarkup(
      <WorkflowActions
        content={{
          id: "content-1",
          state: "in_review",
          authorUserId: "author",
          reviewedAt: null,
        }}
        currentUserId="reviewer"
        permissions={
          new Set(["content:review:assigned", "content:reject:assigned"])
        }
        pending={false}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain("required");
    expect(markup).toContain("Complete review");
    expect(markup).toContain("Reject");
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
  });
});
