import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2EnvironmentSchema } from "@slgs/validation";

import type { CmsObjectStorage } from "./index";

type Signer = typeof getSignedUrl;

export function createCloudflareR2Storage(
  environment: Record<string, string | undefined>,
  dependencies: {
    client?: S3Client;
    signer?: Signer;
    now?: () => Date;
  } = {},
): CmsObjectStorage {
  const config = r2EnvironmentSchema.parse(environment);
  const clientConfig: S3ClientConfig = {
    region: "auto",
    endpoint: config.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: config.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: config.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  };
  const client = dependencies.client ?? new S3Client(clientConfig);
  const signer = dependencies.signer ?? getSignedUrl;
  const now = dependencies.now ?? (() => new Date());
  const expiresIn = config.CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS;
  const expiresAt = () => new Date(now().getTime() + expiresIn * 1_000);

  return {
    async createUpload(input) {
      const command = new PutObjectCommand({
        Bucket: config.CLOUDFLARE_R2_BUCKET,
        Key: input.storageKey,
        ContentType: input.mimeType,
        ContentLength: input.byteSize,
      });
      return {
        uploadUrl: await signer(client, command, { expiresIn }),
        expiresAt: expiresAt(),
      };
    },
    async createDownload(storageKey) {
      const command = new GetObjectCommand({
        Bucket: config.CLOUDFLARE_R2_BUCKET,
        Key: storageKey,
      });
      return {
        downloadUrl: await signer(client, command, { expiresIn }),
        expiresAt: expiresAt(),
      };
    },
    async inspect(storageKey) {
      const result = await client.send(
        new HeadObjectCommand({
          Bucket: config.CLOUDFLARE_R2_BUCKET,
          Key: storageKey,
        }),
      );
      return {
        byteSize: result.ContentLength ?? null,
        mimeType: result.ContentType ?? null,
        etag: result.ETag ?? null,
      };
    },
    async read(storageKey) {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: config.CLOUDFLARE_R2_BUCKET,
          Key: storageKey,
        }),
      );
      if (!result.Body)
        throw new Error("R2 returned an object without a body.");
      return result.Body.transformToByteArray();
    },
  };
}
