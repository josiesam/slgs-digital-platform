import {
  DeleteObjectCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  applicationMembership,
  club,
  createDatabase,
  editorialAuditEvent,
  type DatabaseConnection,
} from "@slgs/db";
import { createScopedGrant } from "@slgs/permissions";
import { r2EnvironmentSchema } from "@slgs/validation";

import { createCloudflareR2Storage } from "./cloudflare-r2";
import { DrizzleCmsRepository } from "./drizzle-repository";
import { MediaService, type CmsActor } from "./index";

const runIntegration = process.env.SLGS_R2_INTEGRATION === "1";

describe.skipIf(!runIntegration)("Cloudflare R2 live integration", () => {
  it("verifies private infrastructure and the complete synthetic media lifecycle", async () => {
    const r2 = r2EnvironmentSchema.parse(process.env);
    const database = createDatabase({
      DATABASE_URL: process.env.CMS_DATABASE_URL,
    });
    const client = new S3Client({
      region: "auto",
      endpoint: r2.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: r2.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: r2.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
    const storage = createCloudflareR2Storage(process.env, { client });
    const storageKeys: string[] = [];
    try {
      await client.send(
        new HeadBucketCommand({ Bucket: r2.CLOUDFLARE_R2_BUCKET }),
      );
      const [membership] = await database.db
        .select({ userId: applicationMembership.userId })
        .from(applicationMembership)
        .where(
          and(
            eq(applicationMembership.application, "cms"),
            eq(applicationMembership.status, "active"),
          ),
        )
        .limit(1);
      expect(membership).toBeDefined();

      await expect(
        database.db.transaction(async (transaction) => {
          const clubId = `verification-r2-${crypto.randomUUID()}`;
          await transaction.insert(club).values({
            id: clubId,
            key: clubId,
            name: "Synthetic R2 verification club",
            createdBy: membership!.userId,
          });
          const repository = new DrizzleCmsRepository(
            transaction as unknown as DatabaseConnection["db"],
          );
          const service = new MediaService(repository, storage);
          const actor: CmsActor = {
            userId: membership!.userId,
            grant: createScopedGrant("cms", [
              {
                assignmentId: "verification:r2",
                permissions: [
                  "media:create:own",
                  "media:read:club",
                  "media:archive:own",
                ],
                scopes: [{ dimension: "club", value: clubId }],
              },
            ]),
          };
          const png = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          ]);
          const initiated = await service.initiateImageUpload(actor, {
            filename: "synthetic-r2-verification.png",
            declaredMimeType: "image/png",
            byteSize: png.byteLength,
            bytes: png,
            altText:
              "Synthetic PNG signature used for infrastructure verification",
            owningClubId: clubId,
          });
          const storageKey = initiated.asset.storageKey;
          storageKeys.push(storageKey);
          const lifetime = initiated.expiresAt.getTime() - Date.now();
          expect(lifetime).toBeGreaterThan(0);
          expect(lifetime).toBeLessThanOrEqual(
            r2.CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS * 1_000,
          );
          const cors = await fetch(initiated.uploadUrl, {
            method: "OPTIONS",
            headers: {
              Origin: process.env.CMS_BETTER_AUTH_BASE_URL!,
              "Access-Control-Request-Method": "PUT",
              "Access-Control-Request-Headers": "content-type",
            },
          });
          expect(cors.ok).toBe(true);
          expect(cors.headers.get("access-control-allow-origin")).toBe(
            process.env.CMS_BETTER_AUTH_BASE_URL,
          );
          expect(cors.headers.get("access-control-allow-origin")).not.toBe("*");
          expect(cors.headers.get("access-control-allow-methods")).toContain(
            "PUT",
          );
          const put = await fetch(initiated.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/png" },
            body: png,
          });
          expect(put.ok).toBe(true);
          const anonymous = await fetch(
            `${r2.CLOUDFLARE_R2_ENDPOINT}/${r2.CLOUDFLARE_R2_BUCKET}/${storageKey}`,
          );
          expect(anonymous.ok).toBe(false);

          const finalized = await service.finalizeImageUpload(
            actor,
            initiated.asset.id,
          );
          expect(finalized.status).toBe("available");
          expect(finalized.checksumSha256).toBe(
            "4c4b6a3be1314ab86138bef4314dde022e600960d8689a2c8f8631802d20dab6",
          );
          expect(await storage.inspect(storageKey)).toMatchObject({
            byteSize: 8,
            mimeType: "image/png",
          });
          const download = await service.createDownload(actor, finalized.id);
          const downloaded = await fetch(download.downloadUrl);
          expect(downloaded.ok).toBe(true);
          expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(png);
          const audit = await transaction
            .select({ eventType: editorialAuditEvent.eventType })
            .from(editorialAuditEvent)
            .where(eq(editorialAuditEvent.resourceId, finalized.id));
          expect(audit.map((event) => event.eventType)).toEqual(
            expect.arrayContaining([
              "media.upload.initiated",
              "media.upload.finalized",
            ]),
          );
          expect((await service.archive(actor, finalized.id)).status).toBe(
            "archived",
          );
          await expect(
            service.createDownload(actor, finalized.id),
          ).rejects.toMatchObject({
            code: "INVALID_TRANSITION",
          });

          const missing = await service.initiateImageUpload(actor, {
            filename: "synthetic-missing.png",
            declaredMimeType: "image/png",
            byteSize: png.byteLength,
            bytes: png,
            altText: "Synthetic missing-object finalisation verification",
            owningClubId: clubId,
          });
          await expect(
            service.finalizeImageUpload(actor, missing.asset.id),
          ).rejects.toBeDefined();
          expect((await repository.findMedia(missing.asset.id))?.status).toBe(
            "rejected",
          );

          const malformed = await service.initiateImageUpload(actor, {
            filename: "synthetic-malformed.png",
            declaredMimeType: "image/png",
            byteSize: png.byteLength,
            bytes: png,
            altText: "Synthetic malformed-object finalisation verification",
            owningClubId: clubId,
          });
          storageKeys.push(malformed.asset.storageKey);
          const malformedPut = await fetch(malformed.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/png" },
            body: new Uint8Array(8),
          });
          expect(malformedPut.ok).toBe(true);
          await expect(
            service.finalizeImageUpload(actor, malformed.asset.id),
          ).rejects.toThrow("not permitted");
          expect((await repository.findMedia(malformed.asset.id))?.status).toBe(
            "rejected",
          );
          transaction.rollback();
        }),
      ).rejects.toThrow();
    } finally {
      for (const storageKey of storageKeys) {
        await client.send(
          new DeleteObjectCommand({
            Bucket: r2.CLOUDFLARE_R2_BUCKET,
            Key: storageKey,
          }),
        );
      }
      await database.client.end();
      client.destroy();
    }
  }, 60_000);
});
