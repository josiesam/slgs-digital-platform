const publicSiteUrl = import.meta.env.PUBLIC_SITE_URL.replace(/\/$/, "");

export function absolutePublicUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${publicSiteUrl}${normalizedPath}`;
}
