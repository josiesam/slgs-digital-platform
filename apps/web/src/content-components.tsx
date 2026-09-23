import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type {
  PublicContentItem,
  PublicContentKind,
} from "@slgs/public-content";
import { RichContentRenderer } from "@slgs/ui";

export function CalendarIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

export function ClockIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function MapPinIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function UserIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

export function CameraIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function AnnouncementIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 013 10c0-1.745.986-3.26 2.436-4.017M18 13l2.857 2.857a1 1 0 001.414-1.414L19.414 11.586a1 1 0 000-1.414l2.857-2.857a1 1 0 00-1.414-1.414L18 8.757"
      />
    </svg>
  );
}

export function ImageIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

export function SearchIcon({
  className = "w-3.5 h-3.5",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-SL", {
    dateStyle: "long",
    timeZone: "Africa/Freetown",
  }).format(new Date(value));

export function parseEventDate(startAt: string) {
  try {
    const date = new Date(startAt);
    if (Number.isNaN(date.getTime())) {
      return { day: "--", month: "---", time: "" };
    }
    const day = new Intl.DateTimeFormat("en-SL", {
      day: "numeric",
      timeZone: "Africa/Freetown",
    }).format(date);
    const month = new Intl.DateTimeFormat("en-SL", {
      month: "short",
      timeZone: "Africa/Freetown",
    })
      .format(date)
      .toUpperCase();
    const time = new Intl.DateTimeFormat("en-SL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Africa/Freetown",
    }).format(date);
    return { day, month, time };
  } catch {
    return { day: "--", month: "---", time: "" };
  }
}

export function formatTimeRange(startAt: string, endAt: string | null) {
  const start = parseEventDate(startAt).time;
  if (!endAt) return start;
  const end = parseEventDate(endAt).time;
  return `${start} - ${end}`;
}

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

  const getLinkProps = (item: PublicContentItem) => {
    switch (kind) {
      case "article":
        return { to: "/news/$slug" as const, params: { slug: item.slug } };
      case "event":
        return { to: "/events/$slug" as const, params: { slug: item.slug } };
      case "gallery":
        return { to: "/gallery/$slug" as const, params: { slug: item.slug } };
      case "announcement":
      default:
        return {
          to: "/announcements/$slug" as const,
          params: { slug: item.slug },
        };
    }
  };

  const gridModifierClass =
    kind === "event"
      ? "editorial-grid--events"
      : kind === "announcement"
        ? "editorial-grid--announcements"
        : "";

  return (
    <div className={`editorial-grid ${gridModifierClass}`}>
      {items.map((item) => {
        const coverMedia = item.media[0];
        const linkProps = getLinkProps(item);

        if (kind === "event") {
          const eventDate = item.event
            ? parseEventDate(item.event.startAt)
            : null;
          const eventTime = item.event
            ? formatTimeRange(item.event.startAt, item.event.endAt)
            : null;

          return (
            <Link
              {...linkProps}
              key={item.id}
              className="group flex md:flex-row flex-col gap-5 bg-white shadow-xs hover:shadow-md p-5 border border-[var(--slgs-border)] hover:border-[var(--slgs-purple-light)] rounded-xl text-left no-underline transition-all cursor-pointer editorial-card editorial-card--event"
            >
              {/* Image container with date badge overlay */}
              <div className="relative bg-slate-100 border border-[var(--slgs-border)] rounded-lg w-full aspect-[4/3] overflow-hidden card-media shrink-0">
                {coverMedia ? (
                  <img
                    src={coverMedia.url}
                    alt={coverMedia.altText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex justify-center items-center bg-[var(--slgs-khaki-light)] w-full h-full text-[var(--slgs-purple-dark)]">
                    <CalendarIcon className="w-8 h-8 text-[var(--slgs-purple)]" />
                  </div>
                )}
                {eventDate && (
                  <div className="top-3 left-3 absolute flex flex-col justify-center items-center bg-[var(--slgs-red)] shadow-md px-2.5 py-1.5 rounded-md min-w-[3.25rem] font-bold text-white text-center">
                    <span className="font-black text-xl leading-none">
                      {eventDate.day}
                    </span>
                    <span className="mt-0.5 font-semibold text-[10px] uppercase tracking-wider">
                      {eventDate.month}
                    </span>
                  </div>
                )}
              </div>

              {/* Content Details */}
              <div className="flex flex-col flex-1 justify-between min-w-0">
                <div>
                  {/* Meta Pill Bar */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {eventTime && (
                      <span className="inline-flex items-center gap-1.5 bg-[var(--slgs-khaki-light)] px-3 py-1 border border-[var(--slgs-khaki)]/40 rounded-full font-semibold text-[var(--slgs-purple-dark)] text-xs">
                        <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                        {eventTime}
                      </span>
                    )}
                    {item.event?.location && (
                      <span className="inline-flex items-center gap-1.5 bg-[var(--slgs-khaki-light)] px-3 py-1 border border-[var(--slgs-khaki)]/40 rounded-full max-w-[200px] font-semibold text-[var(--slgs-purple-dark)] text-xs truncate">
                        <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                        {item.event.location}
                      </span>
                    )}
                  </div>

                  <h3 className="mb-2 font-serif font-bold text-[var(--slgs-purple-dark)] group-hover:text-[var(--slgs-purple)] text-xl leading-tight transition-colors">
                    {item.title}
                  </h3>

                  <p className="mb-3 text-[var(--slgs-muted)] text-sm line-clamp-2 leading-relaxed">
                    {item.summary ?? "Summary not supplied."}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-auto pt-3 border-[var(--slgs-border)]/60 border-t">
                  <span className="font-medium text-[var(--slgs-muted)] text-xs">
                    {item.event?.organiser
                      ? `By ${item.event.organiser}`
                      : formatDate(item.publishedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-[var(--slgs-red)] group-hover:bg-[var(--slgs-purple)] shadow-xs px-4 py-1.5 rounded-md font-bold text-white text-xs transition-colors">
                    Read more{" "}
                    <span className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          );
        }

        if (kind === "article") {
          return (
            <Link
              {...linkProps}
              key={item.id}
              className="group flex flex-col bg-white shadow-xs hover:shadow-md border border-[var(--slgs-border)] hover:border-[var(--slgs-purple-light)] rounded-xl overflow-hidden text-left no-underline transition-all cursor-pointer editorial-card editorial-card--article"
            >
              {coverMedia ? (
                <div className="relative bg-slate-100 border-[var(--slgs-border)] border-b aspect-[16/9] overflow-hidden card-media">
                  <img
                    src={coverMedia.url}
                    alt={coverMedia.altText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="flex flex-col flex-1 justify-between p-5">
                <div>
                  {/* Meta Pill bar */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-[var(--slgs-khaki-light)] px-3 py-1 border border-[var(--slgs-khaki)]/40 rounded-full font-semibold text-[var(--slgs-purple-dark)] text-xs">
                      <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                      {formatDate(item.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[var(--slgs-silver-light)] px-3 py-1 rounded-full font-semibold text-[var(--slgs-ink)] text-xs">
                      <UserIcon className="w-3.5 h-3.5 shrink-0" />
                      SLGS News
                    </span>
                  </div>

                  <h3 className="mb-2 font-serif font-bold text-[var(--slgs-purple-dark)] group-hover:text-[var(--slgs-purple)] text-xl leading-tight transition-colors">
                    {item.title}
                  </h3>

                  <p className="mb-4 text-[var(--slgs-muted)] text-sm line-clamp-3 leading-relaxed">
                    {item.summary ?? "Summary not supplied."}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-auto pt-3 border-[var(--slgs-border)]/60 border-t">
                  <span className="inline-flex items-center gap-1 font-bold text-[var(--slgs-purple)] group-hover:text-[var(--slgs-purple-dark)] text-xs transition-colors">
                    Read Story{" "}
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          );
        }

        if (kind === "announcement") {
          return (
            <Link
              {...linkProps}
              key={item.id}
              className="group flex flex-col bg-white shadow-xs hover:shadow-md p-5 border border-[var(--slgs-border)] hover:border-r-[var(--slgs-purple-light)] border-l-[var(--slgs-purple)] border-l-4 rounded-xl text-left no-underline transition-all cursor-pointer editorial-card editorial-card--announcement"
            >
              <div className="flex justify-between items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 bg-[var(--slgs-purple-dark)] px-3 py-1 rounded-full font-bold text-white text-xs">
                  <AnnouncementIcon className="w-3.5 h-3.5 shrink-0" />
                  Announcement
                </span>
                <span className="font-medium text-[var(--slgs-muted)] text-xs">
                  {formatDate(item.publishedAt)}
                </span>
              </div>

              <h3 className="mb-2 font-serif font-bold text-[var(--slgs-purple-dark)] group-hover:text-[var(--slgs-purple)] text-lg leading-tight transition-colors">
                {item.title}
              </h3>

              <p className="mb-4 text-[var(--slgs-muted)] text-sm line-clamp-2 leading-relaxed">
                {item.summary ?? "Summary not supplied."}
              </p>

              <div className="flex justify-between items-center mt-auto pt-3 border-[var(--slgs-border)]/60 border-t">
                <span className="inline-flex items-center gap-1 font-bold text-[var(--slgs-purple)] group-hover:text-[var(--slgs-purple-dark)] text-xs transition-colors">
                  View Announcement{" "}
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </Link>
          );
        }

        return (
          <Link
            {...linkProps}
            key={item.id}
            className="group flex flex-col bg-white shadow-xs hover:shadow-md border border-[var(--slgs-border)] hover:border-[var(--slgs-purple-light)] rounded-xl overflow-hidden text-left no-underline transition-all cursor-pointer editorial-card editorial-card--gallery"
          >
            {coverMedia ? (
              <div className="relative bg-slate-100 border-[var(--slgs-border)] border-b aspect-[4/3] overflow-hidden card-media">
                <img
                  src={coverMedia.url}
                  alt={coverMedia.altText}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {item.media.length > 0 && (
                  <span className="inline-flex right-3 bottom-3 absolute items-center gap-1.5 bg-black/75 shadow-sm backdrop-blur-md px-3 py-1 rounded-full font-bold text-white text-xs">
                    <CameraIcon className="w-3.5 h-3.5 shrink-0" />
                    {item.media.length}{" "}
                    {item.media.length === 1 ? "photo" : "photos"}
                  </span>
                )}
              </div>
            ) : null}

            <div className="flex flex-col flex-1 justify-between p-5">
              <div>
                <div className="flex justify-between items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 bg-[var(--slgs-khaki-light)] px-3 py-1 border border-[var(--slgs-khaki)]/40 rounded-full font-semibold text-[var(--slgs-purple-dark)] text-xs">
                    <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                    {formatDate(item.publishedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--slgs-muted)] text-xs">
                    <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                    Photo Gallery
                  </span>
                </div>

                <h3 className="mb-2 font-serif font-bold text-[var(--slgs-purple-dark)] group-hover:text-[var(--slgs-purple)] text-xl leading-tight transition-colors">
                  {item.title}
                </h3>

                <p className="mb-4 text-[var(--slgs-muted)] text-sm line-clamp-2 leading-relaxed">
                  {item.summary ?? "Summary not supplied."}
                </p>
              </div>

              <div className="flex justify-between items-center mt-auto pt-3 border-[var(--slgs-border)]/60 border-t">
                <span className="inline-flex items-center gap-1 font-bold text-[var(--slgs-purple)] group-hover:text-[var(--slgs-purple-dark)] text-xs transition-colors">
                  Explore Gallery{" "}
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </div>
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
    <article className="space-y-6 content-detail">
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
        <section className="mt-8 media-gallery">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif font-bold text-xl">
              {item.kind === "gallery" ? "Gallery Photos" : "Attached Media"}
            </h2>
            <span className="font-mono text-muted-foreground text-xs">
              {item.media.length} {item.media.length === 1 ? "image" : "images"}
            </span>
          </div>

          <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {item.media.map((photo, index) => (
              <figure
                key={photo.id}
                onClick={() => setActivePhotoIndex(index)}
                className="group relative bg-card shadow-sm hover:shadow-md border border-border rounded-xl overflow-hidden transition-all cursor-pointer"
              >
                <div className="bg-muted w-full aspect-[4/3] overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.altText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 flex justify-center items-center bg-black/40 opacity-0 group-hover:opacity-100 text-white transition-opacity">
                  <span className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 border border-white/20 rounded-full font-semibold text-xs">
                    <SearchIcon className="w-3.5 h-3.5" /> View full image
                  </span>
                </div>
                {photo.caption || photo.altText ? (
                  <figcaption className="bg-muted/30 p-3 border-border border-t text-muted-foreground text-xs line-clamp-2">
                    {photo.caption ?? photo.altText}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>

          {/* Interactive Lightbox Modal */}
          {activePhoto && activePhotoIndex !== null && (
            <div
              className="z-50 fixed inset-0 flex justify-center items-center bg-black/90 backdrop-blur-md p-4"
              onClick={() => setActivePhotoIndex(null)}
            >
              <div
                className="relative flex flex-col items-center w-full max-w-5xl max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Controls */}
                <div className="flex justify-between items-center p-3 w-full text-white">
                  <span className="font-mono text-xs">
                    {activePhotoIndex + 1} of {item.media.length}
                  </span>
                  <button
                    onClick={() => setActivePhotoIndex(null)}
                    className="hover:bg-white/20 p-2 rounded-full font-bold text-white text-sm transition-colors"
                    aria-label="Close modal"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Main Photo Display */}
                <div className="relative flex justify-center items-center w-full max-h-[75vh]">
                  {item.media.length > 1 && (
                    <button
                      onClick={() =>
                        setActivePhotoIndex((prev) =>
                          prev !== null && prev > 0
                            ? prev - 1
                            : item.media.length - 1,
                        )
                      }
                      className="left-2 z-10 absolute bg-black/60 hover:bg-black/80 p-3 rounded-full font-bold text-white transition-colors"
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                  )}

                  <img
                    src={activePhoto.url}
                    alt={activePhoto.altText}
                    className="shadow-2xl rounded-lg max-w-full max-h-[75vh] object-contain"
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
                      className="right-2 z-10 absolute bg-black/60 hover:bg-black/80 p-3 rounded-full font-bold text-white transition-colors"
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  )}
                </div>

                {/* Caption / Alt text */}
                {(activePhoto.caption || activePhoto.altText) && (
                  <div className="mt-4 px-4 max-w-2xl text-white/90 text-xs text-center">
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
