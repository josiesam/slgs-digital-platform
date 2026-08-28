import { describe, expect, it, vi } from "vitest";
import type { S3Client } from "@aws-sdk/client-s3";

import { createCloudflareR2Storage } from "./cloudflare-r2";

const environment = {
  CLOUDFLARE_R2_ACCOUNT_ID: "account-id",
  CLOUDFLARE_R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
  CLOUDFLARE_R2_BUCKET: "private-cms-media",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "synthetic-access-key",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "synthetic-secret-key",
  CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS: "300",
};

describe("Cloudflare R2 storage adapter", () => {
  it("creates short-lived PUT and GET URLs without exposing credentials", async () => {
    const signer = vi.fn(
      async (_client, command) =>
        `https://signed.invalid/${command.constructor.name}`,
    );
    const storage = createCloudflareR2Storage(environment, {
      client: { send: vi.fn() } as unknown as S3Client,
      signer: signer as never,
      now: () => new Date("2026-08-28T12:00:00.000Z"),
    });
    const upload = await storage.createUpload({
      storageKey: "cms/media/opaque.png",
      mimeType: "image/png",
      byteSize: 8,
    });
    const download = await storage.createDownload("cms/media/opaque.png");
    expect(upload.uploadUrl).toContain("PutObjectCommand");
    expect(download.downloadUrl).toContain("GetObjectCommand");
    expect(upload.expiresAt.toISOString()).toBe("2026-08-28T12:05:00.000Z");
    expect(JSON.stringify([upload, download])).not.toContain(
      "synthetic-secret-key",
    );
  });

  it("uses server-side HEAD and GET for authoritative finalization", async () => {
    const send = vi.fn(async (command) =>
      command.constructor.name === "HeadObjectCommand"
        ? { ContentLength: 8, ContentType: "image/png", ETag: "etag" }
        : {
            Body: {
              transformToByteArray: async () =>
                new Uint8Array([
                  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
                ]),
            },
          },
    );
    const storage = createCloudflareR2Storage(environment, {
      client: { send } as unknown as S3Client,
    });
    expect(await storage.inspect("cms/media/opaque.png")).toEqual({
      byteSize: 8,
      mimeType: "image/png",
      etag: "etag",
    });
    expect(await storage.read("cms/media/opaque.png")).toHaveLength(8);
  });

  it("fails closed when required configuration is absent", () => {
    expect(() => createCloudflareR2Storage({})).toThrow();
  });
});
