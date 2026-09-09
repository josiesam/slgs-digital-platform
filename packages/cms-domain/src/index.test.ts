import { describe, expect, it } from "vitest";

import { createScopedGrant } from "@slgs/permissions";

import {
  CmsDomainError,
  CmsService,
  InMemoryCmsRepository,
  InMemoryMediaRepository,
  MediaService,
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
        return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
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
        return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
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
        return png;
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
});
