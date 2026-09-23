interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly CLOUDFLARE_R2_READ_ACCESS_KEY_ID?: string;
  readonly CLOUDFLARE_R2_READ_SECRET_ACCESS_KEY?: string;
  readonly CLOUDFLARE_R2_ACCESS_KEY_ID?: string;
  readonly CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string;
  readonly CLOUDFLARE_R2_REGION?: string;
  readonly CLOUDFLARE_R2_BUCKET?: string;
  readonly CLOUDFLARE_R2_ENDPOINT?: string;
  readonly CLOUDFLARE_R2_ACCESS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
