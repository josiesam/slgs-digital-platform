import { describe, expect, it } from "vitest";

import { createScopedGrant } from "@slgs/permissions";

import {
  CmsDomainError,
  CmsService,
  InMemoryCmsRepository,
  InMemoryMediaRepository,
  MediaService,
  defaultCanonicalPath,
  validateImageUpload,
  type CmsActor,
} from "./index";

const actor = (
  userId: string,
  permissions: readonly string[],
  clubId = "club-news",
): CmsActor => ({
  userId,
  sessionId: `session-${userId}`,
  grant: createScopedGrant("cms", [
    {
      assignmentId: `assignment-${userId}`,
      permissions,
      scopes: [{ dimension: "club", value: clubId }],
    },
  ]),
});

const articleAuthor = actor("author", [
  "article:create:own",
  "article:update:own",
  "article:submit:own",
  "article:read:club",
]);

const createArticle = async (service: CmsService) =>
  service.createContent(articleAuthor, {
    type: "article",
    title: "A school story",
    slug: "a-school-story",
    summary: "A synthetic editorial test story.",
    body: "Draft body",
    owningClubId: "club-news",
  });

describe("CMS workflow service", () => {
  it("preserves authorship and club ownership through revisions", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const created = await createArticle(service);

    const updated = await service.updateContent(articleAuthor, created.id, {
      title: "A revised school story",
      body: "Revised body",
    });

    expect(updated.authorUserId).toBe("author");
    expect(updated.owningClubId).toBe("club-news");
    expect(updated.currentRevision).toBe(2);
    expect(repository.revisions).toHaveLength(2);
    expect(repository.audit.map((event) => event.eventType)).toEqual([
      "content.created",
      "content.updated",
    ]);
  });

  it("does not erase untouched draft fields when one field is edited", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const authorWithMedia = actor("author", [
      "article:create:own",
      "article:update:own",
      "media:update:own",
    ]);
    const created = await service.createContent(authorWithMedia, {
      type: "article",
      title: "Complete draft",
      slug: "complete-draft",
      summary: "Existing summary",
      body: "Existing body",
      seoTitle: "Existing SEO title",
      seoDescription: "Existing SEO description",
      canonicalPath: "/news/complete-draft",
      owningClubId: "club-news",
    });
    repository.addMedia({
      id: "media-featured",
      ownerUserId: "author",
      owningClubId: "club-news",
      status: "available",
    });
    await service.setContentMedia(authorWithMedia, created.id, [
      "media-featured",
    ]);

    const updated = await service.updateContent(authorWithMedia, created.id, {
      title: "Updated title only",
    });

    expect(updated).toMatchObject({
      title: "Updated title only",
      slug: "complete-draft",
      summary: "Existing summary",
      body: "Existing body",
      seoTitle: "Existing SEO title",
      seoDescription: "Existing SEO description",
      canonicalPath: "/news/complete-draft",
      featuredMediaId: "media-featured",
      currentRevision: 3,
    });
    expect(repository.revisions).toHaveLength(3);
  });

  it("enforces submit, review, approval, publish and unpublish in order", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const created = await createArticle(service);
    const submitted = await service.submit(articleAuthor, created.id);
    const reviewer = actor("reviewer", [
      "content:read:assigned",
      "content:review:assigned",
      "content:reject:assigned",
    ]);
    await service.startReview(reviewer, submitted.id);
    await service.completeReview(reviewer, submitted.id, "Ready for approval");
    const approver = actor("approver", [
      "content:read:assigned",
      "content:approve:assigned",
      "content:reject:assigned",
    ]);
    expect((await service.approve(approver, submitted.id)).state).toBe(
      "approved",
    );
    const publisher = actor("publisher", [
      "content:read:approved",
      "content:publish:approved",
      "content:unpublish:published",
    ]);
    expect((await service.publish(publisher, submitted.id)).state).toBe(
      "published",
    );
    expect((await service.unpublish(publisher, submitted.id)).state).toBe(
      "approved",
    );
  });

  it("supports rejection and resubmission without allowing state bypass", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const created = await createArticle(service);
    const reviewer = actor("reviewer", [
      "content:read:assigned",
      "content:review:assigned",
      "content:reject:assigned",
    ]);
    await expect(
      service.startReview(reviewer, created.id),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await service.submit(articleAuthor, created.id);
    await service.startReview(reviewer, created.id);
    expect(
      (await service.reject(reviewer, created.id, "Needs sources")).state,
    ).toBe("rejected");
    expect((await service.submit(articleAuthor, created.id)).state).toBe(
      "submitted",
    );
  });

  it("denies self-review and self-approval and persists sanitized denials", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const privilegedAuthor = actor("author", [
      "article:create:own",
      "article:submit:own",
      "content:review:assigned",
      "content:approve:assigned",
    ]);
    const item = await service.createContent(privilegedAuthor, {
      type: "article",
      title: "Own work",
      slug: "own-work",
      body: "Text",
      owningClubId: "club-news",
    });
    await service.submit(privilegedAuthor, item.id);

    await expect(
      service.startReview(privilegedAuthor, item.id),
    ).rejects.toBeInstanceOf(CmsDomainError);
    expect(repository.audit.at(-1)).toMatchObject({
      eventType: "authorization.denied",
      outcome: "denied",
      reasonCode: "self_review_denied",
    });
    expect(JSON.stringify(repository.audit)).not.toMatch(
      /password|token|secret|recovery/i,
    );
  });

  it("prevents cross-club access when the granting assignment has another club", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const item = await createArticle(service);
    const multimedia = actor(
      "multimedia-member",
      ["article:read:club"],
      "club-media",
    );

    await expect(service.getContent(multimedia, item.id)).rejects.toMatchObject(
      {
        code: "AUTHORIZATION_DENIED",
      },
    );
    expect(repository.audit.at(-1)?.reasonCode).toBe("scope_mismatch");
  });

  it("prevents an author from creating content under another club", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-media");
    const service = new CmsService(repository);
    await expect(
      service.createContent(articleAuthor, {
        type: "article",
        title: "Wrong club",
        slug: "wrong-club",
        body: "Synthetic content",
        owningClubId: "club-media",
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_DENIED" });
    expect(repository.audit.at(-1)?.reasonCode).toBe("scope_mismatch");
  });

  it("does not let a reviewer publish or a publisher publish unapproved work", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const item = await createArticle(service);
    const reviewer = actor("reviewer", ["content:review:assigned"]);
    const publisher = actor("publisher", ["content:publish:approved"]);

    await expect(service.publish(reviewer, item.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await expect(service.publish(publisher, item.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("associates only authorized available media with a gallery in order", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const galleryAuthor = actor("gallery-author", [
      "gallery:create:own",
      "gallery:update:own",
      "media:update:own",
    ]);
    const gallery = await service.createContent(galleryAuthor, {
      type: "gallery",
      title: "Synthetic gallery",
      slug: "synthetic-gallery",
      body: "Gallery introduction",
      owningClubId: "club-news",
    });
    repository.addMedia({
      id: "media-one",
      ownerUserId: "gallery-author",
      owningClubId: "club-news",
      status: "available",
    });
    repository.addMedia({
      id: "media-two",
      ownerUserId: "gallery-author",
      owningClubId: "club-news",
      status: "available",
    });

    const updated = await service.setContentMedia(galleryAuthor, gallery.id, [
      "media-two",
      "media-one",
    ]);

    expect(updated.featuredMediaId).toBe("media-two");
    expect(updated.currentRevision).toBe(2);
    expect(repository.contentMedia.get(gallery.id)).toEqual([
      "media-two",
      "media-one",
    ]);
  });

  it("rejects archived and cross-club media associations", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);
    const galleryAuthor = actor("gallery-author", [
      "gallery:create:own",
      "gallery:update:own",
      "media:update:own",
      "media:update:club",
    ]);
    const gallery = await service.createContent(galleryAuthor, {
      type: "gallery",
      title: "Scoped gallery",
      slug: "scoped-gallery",
      body: "Gallery introduction",
      owningClubId: "club-news",
    });
    repository.addMedia({
      id: "archived-media",
      ownerUserId: "gallery-author",
      owningClubId: "club-news",
      status: "archived",
    });
    repository.addMedia({
      id: "cross-club-media",
      ownerUserId: "another-author",
      owningClubId: "club-media",
      status: "available",
    });

    await expect(
      service.setContentMedia(galleryAuthor, gallery.id, ["archived-media"]),
    ).rejects.toMatchObject({ code: "INVALID_MEDIA" });
    await expect(
      service.setContentMedia(galleryAuthor, gallery.id, ["cross-club-media"]),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_DENIED" });
  });

  it("auto-generates default canonical path when omitted", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);

    expect(defaultCanonicalPath("article", "my-story")).toBe("/news/my-story");
    expect(defaultCanonicalPath("event", "sports-day")).toBe("/events/sports-day");
    expect(defaultCanonicalPath("gallery", "photos")).toBe("/gallery/photos");
    expect(defaultCanonicalPath("announcement", "notice")).toBe("/announcements/notice");
    expect(defaultCanonicalPath("page", "about")).toBe("/about");

    const created = await service.createContent(articleAuthor, {
      type: "article",
      title: "Story with no path",
      slug: "story-with-no-path",
      body: "Body",
      owningClubId: "club-news",
    });

    expect(created.canonicalPath).toBe("/news/story-with-no-path");
  });
});

describe("single base snapshot + requires_rebase workflow model", () => {
  it("tracks immutable snapshot_id and base_snapshot_id for created and updated content", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);

    const created = await createArticle(service);
    expect(created.currentSnapshotId).toBeDefined();
    expect(created.currentSnapshotId).toMatch(/^snap_/);
    expect(created.currentBaseSnapshotId).toBeNull();

    const initialSnapshotId = created.currentSnapshotId;

    const updated = await service.updateContent(articleAuthor, created.id, {
      title: "Updated headline",
    });
    expect(updated.currentRevision).toBe(2);
    expect(updated.currentSnapshotId).not.toBe(initialSnapshotId);
    expect(updated.currentBaseSnapshotId).toBe(initialSnapshotId);

    const revisions = await repository.findRevisions(created.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.snapshotId).toBe(initialSnapshotId);
    expect(revisions[0]?.baseSnapshotId).toBeNull();
    expect(revisions[1]?.snapshotId).toBe(updated.currentSnapshotId);
    expect(revisions[1]?.baseSnapshotId).toBe(initialSnapshotId);
  });

  it("cascades rejection to requires_rebase without deleting original snapshots", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);

    const baseContent = await createArticle(service);
    const rev1SnapshotId = baseContent.currentSnapshotId!;

    const baseUpdated = await service.updateContent(articleAuthor, baseContent.id, {
      title: "Base Revision 1.3",
    });
    const baseSnapshotId = baseUpdated.currentSnapshotId!;

    // Create a dependent content item linked to baseSnapshotId
    const dependentContent = await service.createContent(articleAuthor, {
      type: "article",
      title: "Dependent Item",
      slug: "dependent-item",
      body: "Dependent body",
      owningClubId: "club-news",
    });
    // Set dependent content's baseSnapshotId to baseSnapshotId
    await repository.saveContent({
      ...dependentContent,
      currentBaseSnapshotId: baseSnapshotId,
    });
    const depRevisions = await repository.findRevisions(dependentContent.id);
    if (depRevisions[0]) {
      this; // update repository revision base
      (depRevisions[0] as any).baseSnapshotId = baseSnapshotId;
    }

    // Submit and reject base content revision
    await service.submit(articleAuthor, baseContent.id);
    const reviewer = actor("reviewer", [
      "content:read:assigned",
      "content:review:assigned",
      "content:reject:assigned",
    ]);
    await service.startReview(reviewer, baseContent.id);
    const rejected = await service.reject(reviewer, baseContent.id, "Fact check failed");

    expect(rejected.state).toBe("rejected");

    // All base content revisions remain intact in repository history
    const revisions = await repository.findRevisions(baseContent.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[1]?.snapshotId).toBe(baseSnapshotId);
    expect(revisions[1]?.status).toBe("rejected");

    // Dependent content item moved to requires_rebase
    const updatedDependent = await repository.findContent(dependentContent.id);
    expect(updatedDependent?.state).toBe("requires_rebase");
  });

  it("performs an immutable rebase operation creating a new revision", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);

    const created = await createArticle(service);
    const updated = await service.updateContent(articleAuthor, created.id, {
      title: "First edit",
    });

    // Manually set item to requires_rebase for test
    await repository.saveContent({
      ...updated,
      state: "requires_rebase",
    });

    const rebased = await service.rebase(articleAuthor, created.id);

    expect(rebased.state).toBe("draft");
    expect(rebased.currentRevision).toBe(3);
    expect(rebased.currentSnapshotId).toBeDefined();
    expect(rebased.currentSnapshotId).not.toBe(updated.currentSnapshotId);

    const revisions = await repository.findRevisions(created.id);
    expect(revisions).toHaveLength(3);
    const latestRev = revisions[2];
    expect(latestRev?.rebasedFromSnapshotId).toBe(updated.currentSnapshotId);
  });

  it("assigns incrementing verifiedVersionNumber upon publication", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);

    const created = await createArticle(service);
    const submitted = await service.submit(articleAuthor, created.id);

    const reviewer = actor("reviewer", [
      "content:read:assigned",
      "content:review:assigned",
    ]);
    await service.startReview(reviewer, submitted.id);
    await service.completeReview(reviewer, submitted.id, "Looks good");

    const approver = actor("approver", [
      "content:read:assigned",
      "content:approve:assigned",
    ]);
    await service.approve(approver, submitted.id);

    const publisher = actor("publisher", [
      "content:read:approved",
      "content:publish:approved",
    ]);
    const published = await service.publish(publisher, submitted.id);

    expect(published.state).toBe("published");
    expect(published.verifiedVersion).toBe(1);

    const revisions = await repository.findRevisions(created.id);
    expect(revisions[0]?.verifiedVersionNumber).toBe(1);
    expect(revisions[0]?.status).toBe("published");
  });

  it("resets active content state to draft when creating a new revision snapshot on published content while base snapshot retains published status", async () => {
    const repository = new InMemoryCmsRepository();
    repository.addClub("club-news");
    const service = new CmsService(repository);

    const created = await createArticle(service);
    await service.submit(articleAuthor, created.id);
    const reviewer = actor("reviewer", ["content:read:assigned", "content:review:assigned"]);
    await service.startReview(reviewer, created.id);
    await service.completeReview(reviewer, created.id, "Reviewed");
    const approver = actor("approver", ["content:read:assigned", "content:approve:assigned"]);
    await service.approve(approver, created.id);
    const publisher = actor("publisher", ["content:read:approved", "content:publish:approved"]);
    const published = await service.publish(publisher, created.id);

    expect(published.state).toBe("published");
    expect(published.verifiedVersion).toBe(1);

    // Edit published content to create Revision 1.1 snapshot
    const updated = await service.updateContent(articleAuthor, created.id, {
      title: "Updated Title for Revision 1.1",
    });

    // New active content state MUST start at draft
    expect(updated.state).toBe("draft");
    expect(updated.currentRevision).toBe(2);
    expect(updated.verifiedVersion).toBe(1); // retains last verified publication version

    const revisions = await repository.findRevisions(created.id);
    expect(revisions).toHaveLength(2);

    // Base snapshot (S1) retains published status and verified version 1
    const baseRev = revisions.find((r) => r.snapshotId === published.currentSnapshotId);
    expect(baseRev?.status).toBe("published");
    expect(baseRev?.verifiedVersionNumber).toBe(1);

    // New revision snapshot (S2) starts at draft status
    const newRev = revisions.find((r) => r.snapshotId === updated.currentSnapshotId);
    expect(newRev?.status).toBe("draft");
    expect(newRev?.baseSnapshotId).toBe(published.currentSnapshotId);
  });
});

describe("media validation", () => {
  it("accepts a verified PNG and creates an opaque storage key", () => {
    const result = validateImageUpload({
      filename: "School Day.PNG",
      declaredMimeType: "image/png",
      byteSize: 128,
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });
    expect(result.normalizedFilename).toBe("school-day.png");
    expect(result.detectedMimeType).toBe("image/png");
    expect(result.storageKey).not.toContain("School Day");
  });

  it("rejects MIME spoofing, unsafe extensions, and oversized uploads", () => {
    expect(() =>
      validateImageUpload({
        filename: "photo.png",
        declaredMimeType: "image/png",
        byteSize: 20,
        bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
    ).toThrow("does not match");
    expect(() =>
      validateImageUpload({
        filename: "payload.svg",
        declaredMimeType: "image/svg+xml",
        byteSize: 20,
        bytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
      }),
    ).toThrow("not permitted");
    expect(() =>
      validateImageUpload({
        filename: "large.jpg",
        declaredMimeType: "image/jpeg",
        byteSize: 10_000_001,
        bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
    ).toThrow("10 MB");
  });

  it("keeps storage server-side, preserves ownership, and audits media lifecycle", async () => {
    const repository = new InMemoryMediaRepository();
    const service = new MediaService(repository, {
      async createUpload({ storageKey }) {
        return {
          uploadUrl: `https://storage.invalid/upload/${storageKey}`,
          expiresAt: new Date(1_900_000_000_000),
        };
      },
      async createDownload(storageKey) {
        return {
          downloadUrl: `https://storage.invalid/download/${storageKey}`,
          expiresAt: new Date(1_900_000_000_000),
        };
      },
      async inspect() {
        return { byteSize: 8, mimeType: "image/png", etag: "etag" };
      },
      async read() {
        const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        return {
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          }),
          byteSize: bytes.byteLength,
          mimeType: "image/png",
          etag: "etag",
        };
      },
    });
    const owner = actor(
      "media-owner",
      ["media:create:own", "media:archive:own"],
      "club-media",
    );
    const initiated = await service.initiateImageUpload(owner, {
      filename: "photo.png",
      declaredMimeType: "image/png",
      byteSize: 8,
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      altText: "Students participating in a synthetic school activity",
      owningClubId: "club-media",
    });
    expect(initiated.asset.ownerUserId).toBe("media-owner");
    expect(initiated.uploadUrl).not.toContain("secret");
    expect((await service.archive(owner, initiated.asset.id)).status).toBe(
      "archived",
    );
    expect(repository.audit.map((event) => event.eventType)).toEqual([
      "media.upload.initiated",
      "media.archived",
    ]);
  });

  it("denies cross-club media archival and audits the denial", async () => {
    const repository = new InMemoryMediaRepository();
    const service = new MediaService(repository, {
      async createUpload() {
        return { uploadUrl: "https://storage.invalid", expiresAt: new Date() };
      },
      async createDownload() {
        return {
          downloadUrl: "https://storage.invalid",
          expiresAt: new Date(),
        };
      },
      async inspect() {
        return { byteSize: 8, mimeType: "image/png", etag: null };
      },
      async read() {
        const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        return {
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          }),
          byteSize: bytes.byteLength,
          mimeType: "image/png",
          etag: "etag",
        };
      },
    });
    const owner = actor("owner", ["media:create:own"], "club-media");
    const initiated = await service.initiateImageUpload(owner, {
      filename: "photo.png",
      declaredMimeType: "image/png",
      byteSize: 8,
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      altText: "Synthetic media",
      owningClubId: "club-media",
    });
    const outsider = actor("outsider", ["media:archive:club"], "club-news");
    await expect(
      service.archive(outsider, initiated.asset.id),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_DENIED" });
    expect(repository.audit.at(-1)?.eventType).toBe("authorization.denied");
  });

  it("re-verifies stored bytes before making an upload available", async () => {
    const repository = new InMemoryMediaRepository();
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const service = new MediaService(repository, {
      async createUpload() {
        return { uploadUrl: "https://storage.invalid", expiresAt: new Date() };
      },
      async createDownload() {
        return {
          downloadUrl: "https://storage.invalid",
          expiresAt: new Date(),
        };
      },
      async inspect() {
        return { byteSize: 8, mimeType: "image/png", etag: "etag" };
      },
      async read() {
        return {
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(png);
              controller.close();
            },
          }),
          byteSize: png.byteLength,
          mimeType: "image/png",
          etag: "etag",
        };
      },
    });
    const owner = actor(
      "owner",
      ["media:create:own", "media:read:club"],
      "club-media",
    );
    const initiated = await service.initiateImageUpload(owner, {
      filename: "photo.png",
      declaredMimeType: "image/png",
      byteSize: 8,
      bytes: png,
      altText: "Synthetic media",
      owningClubId: "club-media",
    });
    const finalized = await service.finalizeImageUpload(
      owner,
      initiated.asset.id,
    );
    expect(finalized.status).toBe("available");
    expect(finalized.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await service.createDownload(owner, finalized.id)).toHaveProperty(
      "downloadUrl",
    );
  });

  it("supports unarchiving, updating metadata, and permanently deleting media", async () => {
    const repository = new InMemoryMediaRepository();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    let deletedKey: string | null = null;
    const service = new MediaService(repository, {
      async createUpload() {
        return { uploadUrl: "https://storage.invalid", expiresAt: new Date() };
      },
      async createDownload() {
        return { downloadUrl: "https://storage.invalid", expiresAt: new Date() };
      },
      async inspect() {
        return { byteSize: 8, mimeType: "image/png", etag: "etag" };
      },
      async read() {
        return {
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(png);
              controller.close();
            },
          }),
          byteSize: 8,
          mimeType: "image/png",
          etag: "etag",
        };
      },
      async delete(key) {
        deletedKey = key;
      },
    });

    const owner = actor(
      "owner",
      ["media:create:own", "media:archive:own", "media:update:own"],
      "club-media",
    );
    const initiated = await service.initiateImageUpload(owner, {
      filename: "photo.png",
      declaredMimeType: "image/png",
      byteSize: 8,
      bytes: png,
      altText: "Original Alt",
      owningClubId: "club-media",
    });

    // Archive and then Unarchive
    await service.archive(owner, initiated.asset.id);
    expect((await repository.findMedia(initiated.asset.id))?.status).toBe("archived");

    const unarchived = await service.unarchive(owner, initiated.asset.id);
    expect(unarchived.status).toBe("available");

    // Update Metadata and Rename Filename
    const updated = await service.updateMetadata(owner, initiated.asset.id, {
      altText: "Updated Alt Text",
      filename: "new-sports-day.png",
    });
    expect(updated.altText).toBe("Updated Alt Text");
    expect(updated.originalFilename).toBe("new-sports-day.png");
    expect(updated.normalizedFilename).toBe("new-sports-day.png");

    // Replace Media File
    const replacement = await service.initiateMediaReplacement(owner, initiated.asset.id, {
      filename: "replacement.png",
      declaredMimeType: "image/png",
      byteSize: 8,
      bytes: png,
    });
    expect(replacement.uploadUrl).toBeDefined();

    const finalizedReplacement = await service.finalizeMediaReplacement(owner, initiated.asset.id, {
      newStorageKey: replacement.newStorageKey,
      originalFilename: "replacement.png",
      normalizedFilename: "replacement.png",
      declaredMimeType: "image/png",
      detectedMimeType: "image/png",
      byteSize: 8,
    });
    expect(finalizedReplacement.originalFilename).toBe("replacement.png");
    expect(finalizedReplacement.status).toBe("available");

    // Delete Media
    await service.deleteMedia(owner, initiated.asset.id);
    expect(await repository.findMedia(initiated.asset.id)).toBeNull();
    expect(deletedKey).toBe(replacement.newStorageKey);
  });
});
