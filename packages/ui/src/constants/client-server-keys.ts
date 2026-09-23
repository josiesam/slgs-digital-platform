/// <reference types="../vite-env.d.ts" />

// BUCKET CONFIG
export const S3_BUCKET_CONFIG = {
  accessKeyId: import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
  secretAccessKey: import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
  region: import.meta.env.CLOUDFLARE_R2_REGION ?? "",
  bucketName: import.meta.env.CLOUDFLARE_R2_BUCKET ?? "",
  endpoint: import.meta.env.CLOUDFLARE_R2_ENDPOINT ?? "",
  accessUrl: import.meta.env.CLOUDFLARE_R2_ACCESS_URL ?? "",
};
