import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type {
  PublicContentItem,
  PublicContentKind,
} from "@slgs/public-content";
import { RichContentRenderer } from "@slgs/ui";

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-SL", {
    dateStyle: "long",
    timeZone: "Africa/Freetown",
  }).format(new Date(value));

export function EmptyState({ children }: { readonly children: string }) {
  return (
    <div className="empty-state">
      <p>{children}</p>
    </div>
  );
}

export function ContentList({
  items,
  kind,
}: {
  readonly items: readonly PublicContentItem[];
  readonly kind: PublicContentKind;
}) {
  if (!items.length)
    return <EmptyState>No published content is available yet.</EmptyState>;

  const detailLink = (item: PublicContentItem, label: string) =>
    kind === "article" ? (
      <Link to="/news/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    ) : kind === "event" ? (
      <Link to="/events/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    ) : kind === "gallery" ? (
      <Link to="/gallery/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    ) : (
      <Link to="/announcements/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    );
  const link = (item: PublicContentItem) =>
    kind === "article"
      ? `/news/${item.slug}`
      : kind === "event"
        ? `/events/${item.slug}`
        : kind === "gallery"
          ? `/gallery/${item.slug}`
          : `/announcements/${item.slug}`;

  return (
    <div className="editorial-grid">
      {items.map((item) => {
        const coverMedia = item.media[0];
        return (
          <Link to={link(item)} className="editorial-card group" key={item.id}>
            {coverMedia ? (
              <div className="card-media relative mb-3 overflow-hidden rounded-lg aspect-video bg-muted border border-border">
                <img
                  src={coverMedia.url}
                  alt={coverMedia.altText}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {kind === "gallery" && item.media.length > 0 && (
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/75 text-white backdrop-blur-sm shadow">
                    📷 {item.media.length}{" "}
                    {item.media.length === 1 ? "photo" : "photos"}
                  </span>
                )}
              </div>
            ) : null}
            <p className="eyebrow">
              {kind === "event" && item.event
                ? formatDate(item.event.startAt)
                : formatDate(item.publishedAt)}
            </p>
            <h2>{detailLink(item, item.title)}</h2>
            <p>{item.summary ?? "Summary not supplied."}</p>
            <span className="text-link">
              {detailLink(
                item,
                `Read ${kind === "article" ? "article" : kind}`,
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function ContentDetail({ item }: { readonly item: PublicContentItem }) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const activePhoto =
    activePhotoIndex !== null ? (item.media[activePhotoIndex] ?? null) : null;

  return (
    <article className="content-detail space-y-6">
      <header>
        <p className="eyebrow">Published {formatDate(item.publishedAt)}</p>
        <h1>{item.title}</h1>
        {item.summary ? <p className="lead">{item.summary}</p> : null}
      </header>

      {item.event ? (
        <dl className="event-facts">
          <div>
            <dt>Date</dt>
            <dd>{formatDate(item.event.startAt)}</dd>
          </div>
          {item.event.location ? (
            <div>
              <dt>Location</dt>
              <dd>{item.event.location}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <RichContentRenderer nodes={item.body} />

      {item.media.length > 0 ? (
        <section className="media-gallery mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-serif">
              {item.kind === "gallery" ? "Gallery Photos" : "Attached Media"}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {item.media.length} {item.media.length === 1 ? "image" : "images"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {item.media.map((photo, index) => (
              <figure
                key={photo.id}
                onClick={() => setActivePhotoIndex(index)}
                className="group relative cursor-pointer rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img
                    src={photo.url}
                    alt={photo.altText}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-sm border border-white/20">
                    🔍 View full image
                  </span>
                </div>
                {photo.caption || photo.altText ? (
                  <figcaption className="p-3 text-xs text-muted-foreground border-t border-border bg-muted/30 line-clamp-2">
                    {photo.caption ?? photo.altText}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>

          {/* Interactive Lightbox Modal */}
          {activePhoto && activePhotoIndex !== null && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
              onClick={() => setActivePhotoIndex(null)}
            >
              <div
                className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Controls */}
                <div className="w-full flex items-center justify-between p-3 text-white">
                  <span className="text-xs font-mono">
                    {activePhotoIndex + 1} of {item.media.length}
                  </span>
                  <button
                    onClick={() => setActivePhotoIndex(null)}
                    className="p-2 rounded-full hover:bg-white/20 text-white font-bold text-sm transition-colors"
                    aria-label="Close modal"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Main Photo Display */}
                <div className="relative flex items-center justify-center max-h-[75vh] w-full">
                  {item.media.length > 1 && (
                    <button
                      onClick={() =>
                        setActivePhotoIndex((prev) =>
                          prev !== null && prev > 0
                            ? prev - 1
                            : item.media.length - 1,
                        )
                      }
                      className="absolute left-2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white font-bold transition-colors"
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                  )}

                  <img
                    src={activePhoto.url}
                    alt={activePhoto.altText}
                    className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
                  />

                  {item.media.length > 1 && (
                    <button
                      onClick={() =>
                        setActivePhotoIndex((prev) =>
                          prev !== null && prev < item.media.length - 1
                            ? prev + 1
                            : 0,
                        )
                      }
                      className="absolute right-2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white font-bold transition-colors"
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  )}
                </div>

                {/* Caption / Alt text */}
                {(activePhoto.caption || activePhoto.altText) && (
                  <div className="mt-4 text-center max-w-2xl px-4 text-xs text-white/90">
                    <p className="font-medium">
                      {activePhoto.caption ?? activePhoto.altText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : item.kind === "gallery" ? (
        <EmptyState>No photos have been added to this gallery yet.</EmptyState>
      ) : null}
    </article>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  introduction,
  level = 1,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly introduction: string;
  readonly level?: 1 | 2;
}) {
  return (
    <header className="section-hero">
      <p className="eyebrow">{eyebrow}</p>
      {level === 1 ? <h1>{title}</h1> : <h2>{title}</h2>}
      <p>{introduction}</p>
    </header>
  );
}
